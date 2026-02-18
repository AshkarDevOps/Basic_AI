"""
Stock Management API
Handles CRUD operations for dynamic stock list
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from database.db import get_db
from database.models import Stock
from datetime import datetime

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


# === REQUEST/RESPONSE MODELS ===

class StockCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20, description="Stock symbol (e.g., RELIANCE)")
    name: Optional[str] = Field(None, max_length=100, description="Company name")
    exchange: str = Field(default="NSE", description="Exchange (NSE, BSE, etc.)")
    sector: Optional[str] = Field(None, max_length=50, description="Sector/Industry")


class StockUpdate(BaseModel):
    name: Optional[str] = None
    exchange: Optional[str] = None
    sector: Optional[str] = None
    is_active: Optional[bool] = None


class StockResponse(BaseModel):
    id: int
    symbol: str
    name: Optional[str]
    exchange: str
    sector: Optional[str]
    added_date: str
    is_active: bool
    
    class Config:
        from_attributes = True


class BulkStockCreate(BaseModel):
    stocks: List[str] = Field(..., description="List of stock symbols")
    exchange: str = Field(default="NSE")


# === ENDPOINTS ===

@router.get("/", response_model=List[StockResponse])
async def get_all_stocks(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """
    Get all stocks from database
    
    Query params:
    - active_only: Filter only active stocks (default: True)
    """
    query = db.query(Stock)
    
    if active_only:
        query = query.filter(Stock.is_active == True)
    
    stocks = query.order_by(Stock.symbol).all()
    
    return [stock.to_dict() for stock in stocks]


@router.get("/{stock_id}", response_model=StockResponse)
async def get_stock(stock_id: int, db: Session = Depends(get_db)):
    """
    Get specific stock by ID
    """
    stock = db.query(Stock).filter(Stock.id == stock_id).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock with ID {stock_id} not found"
        )
    
    return stock.to_dict()


@router.get("/symbol/{symbol}", response_model=StockResponse)
async def get_stock_by_symbol(symbol: str, db: Session = Depends(get_db)):
    """
    Get stock by symbol
    """
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock '{symbol}' not found"
        )
    
    return stock.to_dict()


@router.post("/", response_model=StockResponse, status_code=status.HTTP_201_CREATED)
async def add_stock(stock: StockCreate, db: Session = Depends(get_db)):
    """
    Add a new stock to the database
    """
    # Check if stock already exists
    existing = db.query(Stock).filter(Stock.symbol == stock.symbol.upper()).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Stock '{stock.symbol}' already exists"
        )
    
    # Create new stock
    new_stock = Stock(
        symbol=stock.symbol.upper(),
        name=stock.name,
        exchange=stock.exchange,
        sector=stock.sector,
        added_date=datetime.utcnow(),
        is_active=True
    )
    
    db.add(new_stock)
    db.commit()
    db.refresh(new_stock)
    
    return new_stock.to_dict()


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def add_stocks_bulk(data: BulkStockCreate, db: Session = Depends(get_db)):
    """
    Add multiple stocks at once
    
    Returns:
    - added: List of successfully added stocks
    - skipped: List of stocks that already exist
    """
    added = []
    skipped = []
    
    for symbol in data.stocks:
        symbol_upper = symbol.upper().strip()
        
        # Check if exists
        existing = db.query(Stock).filter(Stock.symbol == symbol_upper).first()
        
        if existing:
            skipped.append(symbol_upper)
            continue
        
        # Add new stock
        new_stock = Stock(
            symbol=symbol_upper,
            exchange=data.exchange,
            added_date=datetime.utcnow(),
            is_active=True
        )
        
        db.add(new_stock)
        added.append(symbol_upper)
    
    db.commit()
    
    return {
        "added": added,
        "skipped": skipped,
        "total_added": len(added),
        "total_skipped": len(skipped)
    }


@router.put("/{stock_id}", response_model=StockResponse)
async def update_stock(
    stock_id: int,
    stock_update: StockUpdate,
    db: Session = Depends(get_db)
):
    """
    Update stock information
    """
    stock = db.query(Stock).filter(Stock.id == stock_id).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock with ID {stock_id} not found"
        )
    
    # Update fields
    update_data = stock_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(stock, field, value)
    
    db.commit()
    db.refresh(stock)
    
    return stock.to_dict()


@router.delete("/{stock_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stock(stock_id: int, db: Session = Depends(get_db)):
    """
    Delete a stock from database
    This will also remove it from all watchlists
    """
    stock = db.query(Stock).filter(Stock.id == stock_id).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock with ID {stock_id} not found"
        )
    
    db.delete(stock)
    db.commit()
    
    return None


@router.delete("/symbol/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stock_by_symbol(symbol: str, db: Session = Depends(get_db)):
    """
    Delete a stock by symbol
    """
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock '{symbol}' not found"
        )
    
    db.delete(stock)
    db.commit()
    
    return None


@router.get("/count/total")
async def get_stock_count(db: Session = Depends(get_db)):
    """
    Get total count of stocks in database
    """
    total = db.query(Stock).count()
    active = db.query(Stock).filter(Stock.is_active == True).count()
    
    return {
        "total": total,
        "active": active,
        "inactive": total - active
    }