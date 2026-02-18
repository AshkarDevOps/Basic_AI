"""
Strategy Management and Execution API
Handles dynamic strategy discovery, metadata, and execution
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from database.db import get_db
from database.models import StrategyMetadata, StrategyResult, Watchlist, Stock
from strategies.base_strategy import load_strategy_class
from datetime import datetime
import os
import glob
import importlib.util
import json
import time
import shutil

router = APIRouter(prefix="/api/strategies", tags=["strategies"])

# Strategy scripts directory
STRATEGIES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'strategies')


# === REQUEST/RESPONSE MODELS ===

class StrategyResponse(BaseModel):
    id: int
    script_name: str
    display_name: str
    description: Optional[str]
    strategy_type: str
    timeframe: Optional[str]
    indicators_used: Optional[str]  # JSON string in DB (e.g. '["EMA20","EMA50"]')
    ai_logic: Optional[str]
    criteria: Optional[str]
    is_active: bool
    last_scanned: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ExecuteStrategyRequest(BaseModel):
    watchlist_id: int = Field(..., description="Watchlist ID to analyze")
    strategy_id: int = Field(..., description="Strategy ID to execute")
    save_results: bool = Field(default=True, description="Save results to database")


class MultiStrategyExecuteRequest(BaseModel):
    watchlist_id: int = Field(..., description="Watchlist ID to analyze")
    strategy_ids: List[int] = Field(..., description="List of strategy IDs to execute")
    save_results: bool = Field(default=True, description="Save results to database")


class StrategyExecutionResult(BaseModel):
    strategy_name: str
    watchlist_name: str
    total_stocks: int
    matched_stocks: int
    execution_time_ms: int
    results: List[dict]


# === UTILITY FUNCTIONS ===

def scan_strategy_files():
    """
    Scan the strategies directory for .py files
    Returns list of strategy file paths (excluding __init__ and base_strategy)
    """
    pattern = os.path.join(STRATEGIES_DIR, '*.py')
    files = glob.glob(pattern)
    
    # Filter out special files
    exclude = ['__init__.py', 'base_strategy.py']
    
    return [
        f for f in files 
        if os.path.basename(f) not in exclude
    ]


def load_strategy_metadata(file_path: str) -> dict:
    """
    Load metadata from a strategy file without executing the analyze method
    """
    try:
        strategy_class = load_strategy_class(file_path)
        metadata = strategy_class.get_metadata()
        metadata['file_path'] = file_path
        return metadata
    except Exception as e:
        print(f"Error loading strategy from {file_path}: {str(e)}")
        return None


def save_strategy_results(
    db: Session,
    strategy_id: int,
    watchlist_id: int,
    results_df,
    execution_time_ms: int
):
    """
    Save strategy execution results to database
    """
    # Clear old results for this strategy + watchlist combination
    db.query(StrategyResult).filter(
        StrategyResult.strategy_id == strategy_id,
        StrategyResult.watchlist_id == watchlist_id
    ).delete()
    
    # Save new results
    for _, row in results_df.iterrows():
        # Get stock ID
        stock = db.query(Stock).filter(Stock.symbol == row['Stock']).first()
        
        if not stock:
            continue
        
        result = StrategyResult(
            strategy_id=strategy_id,
            watchlist_id=watchlist_id,
            stock_id=stock.id,
            matched=row.get('Matched', False),
            confidence_score=row.get('Confidence', None),
            trend_score=row.get('Score', None),
            reason=row.get('Reason', ''),
            price=row.get('Price', None),
            rsi=row.get('RSI', None),
            volume_ratio=row.get('RVOL', None),
            execution_date=datetime.utcnow(),
            execution_time_ms=execution_time_ms
        )
        
        db.add(result)
    
    db.commit()


# === ENDPOINTS ===

@router.post("/scan", status_code=status.HTTP_200_OK)
async def scan_strategies(db: Session = Depends(get_db)):
    """
    Scan strategies directory and update database
    """
    strategy_files = scan_strategy_files()
    
    added = []
    updated = []
    errors = []
    
    for file_path in strategy_files:
        try:
            metadata = load_strategy_metadata(file_path)
            
            if not metadata:
                errors.append(os.path.basename(file_path))
                continue
            
            # Check if strategy exists
            existing = db.query(StrategyMetadata).filter(
                StrategyMetadata.script_name == metadata['script_name']
            ).first()
            
            if existing:
                for key, value in metadata.items():
                    if key != 'script_name':
                        setattr(existing, key, value)
                existing.last_scanned = datetime.utcnow()
                updated.append(metadata['script_name'])
            else:
                new_strategy = StrategyMetadata(
                    **metadata,
                    is_active=True,
                    last_scanned=datetime.utcnow()
                )
                db.add(new_strategy)
                added.append(metadata['script_name'])
            
        except Exception as e:
            errors.append(f"{os.path.basename(file_path)}: {str(e)}")
    
    db.commit()
    
    return {
        "scanned": len(strategy_files),
        "added": added,
        "updated": updated,
        "errors": errors,
        "total_strategies": db.query(StrategyMetadata).filter(
            StrategyMetadata.is_active == True
        ).count()
    }


@router.get("/")
async def get_all_strategies(
    active_only: bool = False,  # Changed to False to show all by default
    db: Session = Depends(get_db)
):
    """
    Get all strategies
    Set active_only=true to only get active strategies
    """
    query = db.query(StrategyMetadata)
    if active_only:
        query = query.filter(StrategyMetadata.is_active == True)
    
    strategies = query.order_by(StrategyMetadata.display_name).all()
    return [strategy.to_dict() for strategy in strategies]


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_strategy(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a new strategy file
    """
    # Validate file extension
    if not file.filename.endswith('.py'):
        raise HTTPException(
            status_code=400, 
            detail="Only .py files are allowed"
        )
    
    # Prevent overwriting special files
    if file.filename in ['__init__.py', 'base_strategy.py']:
        raise HTTPException(
            status_code=400,
            detail="Cannot upload files with reserved names"
        )
    
    # Save file
    file_path = os.path.join(STRATEGIES_DIR, file.filename)
    
    try:
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(file.file, f)
        
        # Try to load and register the strategy
        metadata = load_strategy_metadata(file_path)
        
        if not metadata:
            # Delete the file if it's invalid
            os.remove(file_path)
            raise HTTPException(
                status_code=400,
                detail="Invalid strategy file. Must implement BaseStrategy class with get_metadata() method."
            )
        
        # Check if strategy already exists
        existing = db.query(StrategyMetadata).filter(
            StrategyMetadata.script_name == metadata['script_name']
        ).first()
        
        if existing:
            # Update existing
            for key, value in metadata.items():
                if key != 'script_name':
                    setattr(existing, key, value)
            existing.last_scanned = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            
            return {
                "message": f"Strategy '{metadata['display_name']}' updated successfully",
                "strategy": existing.to_dict(),
                "action": "updated"
            }
        else:
            # Add new
            new_strategy = StrategyMetadata(
                **metadata,
                is_active=True,
                last_scanned=datetime.utcnow()
            )
            db.add(new_strategy)
            db.commit()
            db.refresh(new_strategy)
            
            return {
                "message": f"Strategy '{metadata['display_name']}' uploaded successfully",
                "strategy": new_strategy.to_dict(),
                "action": "created"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file if there was an error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{strategy_id}")
async def download_strategy(
    strategy_id: int,
    db: Session = Depends(get_db)
):
    """
    Download a strategy file
    """
    strategy = db.query(StrategyMetadata).filter(
        StrategyMetadata.id == strategy_id
    ).first()
    
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    if not os.path.exists(strategy.file_path):
        raise HTTPException(status_code=404, detail="Strategy file not found on disk")
    
    return FileResponse(
        strategy.file_path,
        media_type='text/x-python',
        filename=strategy.script_name
    )


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_strategy(
    strategy_id: int,
    delete_file: bool = False,
    db: Session = Depends(get_db)
):
    """
    Delete a strategy from database (optionally delete file too)
    
    Parameters:
    - strategy_id: ID of strategy to delete
    - delete_file: If true, also delete the .py file from disk
    """
    strategy = db.query(StrategyMetadata).filter(
        StrategyMetadata.id == strategy_id
    ).first()
    
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Delete results first (foreign key constraint)
    db.query(StrategyResult).filter(
        StrategyResult.strategy_id == strategy_id
    ).delete()
    
    # Optionally delete file
    if delete_file and os.path.exists(strategy.file_path):
        try:
            os.remove(strategy.file_path)
        except Exception as e:
            print(f"Warning: Could not delete file {strategy.file_path}: {e}")
    
    # Delete from database
    db.delete(strategy)
    db.commit()
    
    return None


@router.post("/execute", response_model=StrategyExecutionResult)
async def execute_strategy(
    request: ExecuteStrategyRequest,
    db: Session = Depends(get_db)
):
    """
    Execute a single strategy on a watchlist
    """
    watchlist = db.query(Watchlist).filter(Watchlist.id == request.watchlist_id).first()
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    strategy_meta = db.query(StrategyMetadata).filter(StrategyMetadata.id == request.strategy_id).first()
    if not strategy_meta or not strategy_meta.is_active:
        raise HTTPException(status_code=400, detail="Strategy not found or inactive")
    
    stock_symbols = [stock.symbol for stock in watchlist.stocks]
    if not stock_symbols:
        raise HTTPException(status_code=400, detail="Watchlist has no stocks")
    
    try:
        start_time = time.time()
        strategy_class = load_strategy_class(strategy_meta.file_path)
        strategy_instance = strategy_class()
        results_df = strategy_instance.analyze(stock_symbols)
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        results_list = results_df.to_dict('records')
        
        if request.save_results:
            save_strategy_results(db, strategy_meta.id, watchlist.id, results_df, execution_time_ms)
        
        matched_count = len([r for r in results_list if r.get('Matched', False)])
        
        return StrategyExecutionResult(
            strategy_name=strategy_meta.display_name,
            watchlist_name=watchlist.name,
            total_stocks=len(results_list),
            matched_stocks=matched_count,
            execution_time_ms=execution_time_ms,
            results=results_list
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute-multiple")
async def execute_multiple_strategies(
    request: MultiStrategyExecuteRequest,
    db: Session = Depends(get_db)
):
    """
    Execute multiple strategies on a single watchlist
    Returns consolidated results showing which strategies matched each stock
    """
    watchlist = db.query(Watchlist).filter(Watchlist.id == request.watchlist_id).first()
    if not watchlist:
        raise HTTPException(status_code=404, detail=f"Watchlist {request.watchlist_id} not found")

    strategies_meta = db.query(StrategyMetadata).filter(
        StrategyMetadata.id.in_(request.strategy_ids),
        StrategyMetadata.is_active == True
    ).all()

    if not strategies_meta:
        raise HTTPException(status_code=404, detail="No active strategies found with provided IDs")

    stock_symbols = [stock.symbol for stock in watchlist.stocks]
    if not stock_symbols:
        raise HTTPException(status_code=400, detail="Watchlist has no stocks")

    all_results = {}
    strategies_info = {}

    for strategy_meta in strategies_meta:
        try:
            start_time = time.time()
            strategy_class = load_strategy_class(strategy_meta.file_path)
            strategy_instance = strategy_class()
            results_df = strategy_instance.analyze(stock_symbols)
            
            execution_time_ms = int((time.time() - start_time) * 1000)
            all_results[strategy_meta.id] = results_df
            strategies_info[strategy_meta.id] = {
                "name": strategy_meta.display_name,
                "type": strategy_meta.strategy_type
            }

            if request.save_results:
                save_strategy_results(db, strategy_meta.id, watchlist.id, results_df, execution_time_ms)
        except Exception as e:
            print(f"❌ Error executing strategy {strategy_meta.display_name}: {str(e)}")
            continue

    consolidated = []
    for symbol in stock_symbols:
        stock_result = {"symbol": symbol, "strategies": {}, "total_matches": 0}
        for strategy_id, results_df in all_results.items():
            stock_rows = results_df[results_df['Stock'] == symbol]
            if not stock_rows.empty:
                row = stock_rows.iloc[0]
                is_match = bool(row.get('Matched', False))
                stock_result["strategies"][strategy_id] = {
                    "matched": is_match,
                    "score": int(row.get('Score', 0)),
                    "confidence": float(row.get('Confidence', 0)) if row.get('Confidence') else None,
                    "reason": str(row.get('Reason', ''))
                }
                if is_match:
                    stock_result["total_matches"] += 1
        consolidated.append(stock_result)

    return {
        "watchlist_name": watchlist.name,
        "total_stocks": len(stock_symbols),
        "strategy_count": len(strategies_info),
        "strategies": strategies_info,
        "results": consolidated
    }


@router.get("/results/latest")
async def get_latest_results(
    strategy_id: Optional[int] = None,
    watchlist_id: Optional[int] = None,
    matched_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get latest strategy results with optional filters
    """
    query = db.query(StrategyResult)
    if strategy_id:
        query = query.filter(StrategyResult.strategy_id == strategy_id)
    if watchlist_id:
        query = query.filter(StrategyResult.watchlist_id == watchlist_id)
    if matched_only:
        query = query.filter(StrategyResult.matched == True)
    
    results = query.order_by(StrategyResult.execution_date.desc()).limit(limit).all()
    return [result.to_dict() for result in results]


@router.put("/{strategy_id}/toggle")
async def toggle_strategy(strategy_id: int, db: Session = Depends(get_db)):
    """
    Toggle strategy active/inactive status
    """
    strategy = db.query(StrategyMetadata).filter(StrategyMetadata.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    strategy.is_active = not strategy.is_active
    db.commit()
    db.refresh(strategy)
    return strategy.to_dict()


@router.delete("/results", status_code=status.HTTP_204_NO_CONTENT)
async def clear_results(
    strategy_id: Optional[int] = None,
    watchlist_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Clear strategy results with optional filters
    """
    query = db.query(StrategyResult)
    if strategy_id:
        query = query.filter(StrategyResult.strategy_id == strategy_id)
    if watchlist_id:
        query = query.filter(StrategyResult.watchlist_id == watchlist_id)
    
    query.delete()
    db.commit()
    return None