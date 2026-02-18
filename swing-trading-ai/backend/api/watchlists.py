"""
Watchlist Management API
Handles CRUD operations for dynamic watchlists
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from database.db import get_db
from database.models import Watchlist, Stock
from datetime import datetime

router = APIRouter(prefix="/api/watchlists", tags=["watchlists"])


# === REQUEST/RESPONSE MODELS ===

class WatchlistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Watchlist name")
    description: Optional[str] = Field(None, description="Watchlist description")


class WatchlistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class AddStocksToWatchlist(BaseModel):
    stock_ids: List[int] = Field(..., description="List of stock IDs to add")


class AddStocksBySymbol(BaseModel):
    symbols: List[str] = Field(..., description="List of stock symbols to add")


class WatchlistResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_date: str
    updated_date: str
    stock_count: int
    stocks: Optional[List[dict]] = None
    
    class Config:
        from_attributes = True


# === ENDPOINTS ===

@router.get("/", response_model=List[WatchlistResponse])
async def get_all_watchlists(
    include_stocks: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get all watchlists
    
    Query params:
    - include_stocks: Include full stock details (default: False)
    """
    watchlists = db.query(Watchlist).order_by(Watchlist.name).all()
    
    return [wl.to_dict(include_stocks=include_stocks) for wl in watchlists]


@router.get("/{watchlist_id}", response_model=WatchlistResponse)
async def get_watchlist(
    watchlist_id: int,
    include_stocks: bool = True,
    db: Session = Depends(get_db)
):
    """
    Get specific watchlist by ID
    """
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist with ID {watchlist_id} not found"
        )
    
    return watchlist.to_dict(include_stocks=include_stocks)


@router.get("/name/{name}", response_model=WatchlistResponse)
async def get_watchlist_by_name(
    name: str,
    include_stocks: bool = True,
    db: Session = Depends(get_db)
):
    """
    Get watchlist by name
    """
    watchlist = db.query(Watchlist).filter(Watchlist.name == name).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist '{name}' not found"
        )
    
    return watchlist.to_dict(include_stocks=include_stocks)


@router.post("/", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
async def create_watchlist(
    watchlist: WatchlistCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new watchlist
    """
    # Check if watchlist with same name exists
    existing = db.query(Watchlist).filter(Watchlist.name == watchlist.name).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Watchlist '{watchlist.name}' already exists"
        )
    
    # Create new watchlist
    new_watchlist = Watchlist(
        name=watchlist.name,
        description=watchlist.description,
        created_date=datetime.utcnow(),
        updated_date=datetime.utcnow()
    )
    
    db.add(new_watchlist)
    db.commit()
    db.refresh(new_watchlist)
    
    return new_watchlist.to_dict(include_stocks=True)


@router.put("/{watchlist_id}", response_model=WatchlistResponse)
async def update_watchlist(
    watchlist_id: int,
    watchlist_update: WatchlistUpdate,
    db: Session = Depends(get_db)
):
    """
    Update watchlist information
    """
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist with ID {watchlist_id} not found"
        )
    
    # Update fields
    update_data = watchlist_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(watchlist, field, value)
    
    watchlist.updated_date = datetime.utcnow()
    
    db.commit()
    db.refresh(watchlist)
    
    return watchlist.to_dict(include_stocks=True)


@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    """
    Delete a watchlist
    """
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist with ID {watchlist_id} not found"
        )
    
    db.delete(watchlist)
    db.commit()
    
    return None


# === STOCK MANAGEMENT IN WATCHLIST ===

@router.post("/{watchlist_id}/stocks", status_code=status.HTTP_200_OK)
async def add_stocks_to_watchlist(
    watchlist_id: int,
    data: AddStocksToWatchlist,
    db: Session = Depends(get_db)
):
    """
    Add stocks to a watchlist by stock IDs
    """
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist with ID {watchlist_id} not found"
        )
    
    added = []
    skipped = []
    not_found = []
    
    for stock_id in data.stock_ids:
        stock = db.query(Stock).filter(Stock.id == stock_id).first()
        
        if not stock:
            not_found.append(stock_id)
            continue
        
        # Check if already in watchlist
        if stock in watchlist.stocks:
            skipped.append(stock.symbol)
            continue
        
        watchlist.stocks.append(stock)
        added.append(stock.symbol)
    
    watchlist.updated_date = datetime.utcnow()
    db.commit()
    
    return {
        "watchlist": watchlist.name,
        "added": added,
        "skipped": skipped,
        "not_found": not_found,
        "total_stocks": len(watchlist.stocks)
    }


@router.post("/{watchlist_id}/stocks/by-symbol", status_code=status.HTTP_200_OK)
async def add_stocks_by_symbol(
    watchlist_id: int,
    data: AddStocksBySymbol,
    db: Session = Depends(get_db)
):
    """
    Add stocks to a watchlist by stock symbols
    """
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist with ID {watchlist_id} not found"
        )
    
    added = []
    skipped = []
    not_found = []
    
    for symbol in data.symbols:
        symbol_upper = symbol.upper().strip()
        stock = db.query(Stock).filter(Stock.symbol == symbol_upper).first()
        
        if not stock:
            not_found.append(symbol_upper)
            continue
        
        # Check if already in watchlist
        if stock in watchlist.stocks:
            skipped.append(stock.symbol)
            continue
        
        watchlist.stocks.append(stock)
        added.append(stock.symbol)
    
    watchlist.updated_date = datetime.utcnow()
    db.commit()
    
    return {
        "watchlist": watchlist.name,
        "added": added,
        "skipped": skipped,
        "not_found": not_found,
        "total_stocks": len(watchlist.stocks)
    }


@router.delete("/{watchlist_id}/stocks/{stock_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_stock_from_watchlist(
    watchlist_id: int,
    stock_id: int,
    db: Session = Depends(get_db)
):
    """
    Remove a stock from watchlist
    """
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist with ID {watchlist_id} not found"
        )
    
    stock = db.query(Stock).filter(Stock.id == stock_id).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock with ID {stock_id} not found"
        )
    
    if stock not in watchlist.stocks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock '{stock.symbol}' not in watchlist '{watchlist.name}'"
        )
    
    watchlist.stocks.remove(stock)
    watchlist.updated_date = datetime.utcnow()
    db.commit()
    
    return None


@router.get("/{watchlist_id}/stocks")
async def get_watchlist_stocks(
    watchlist_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all stocks in a watchlist
    Returns just the symbols for use in strategy execution
    """
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist with ID {watchlist_id} not found"
        )
    
    return {
        "watchlist_id": watchlist.id,
        "watchlist_name": watchlist.name,
        "stock_count": len(watchlist.stocks),
        "stocks": [stock.to_dict() for stock in watchlist.stocks],
        "symbols": [stock.symbol for stock in watchlist.stocks]
    }


@router.delete("/{watchlist_id}/stocks", status_code=status.HTTP_204_NO_CONTENT)
async def clear_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    """
    Remove all stocks from a watchlist
    """
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist with ID {watchlist_id} not found"
        )
    
    watchlist.stocks.clear()
    watchlist.updated_date = datetime.utcnow()
    db.commit()
    
    return None