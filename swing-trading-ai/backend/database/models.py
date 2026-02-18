"""
Database Models for Swing Trading AI Platform
All tables are dynamic with no static data
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

# Many-to-Many relationship table for Watchlists and Stocks
watchlist_stocks = Table(
    'watchlist_stocks',
    Base.metadata,
    Column('watchlist_id', Integer, ForeignKey('watchlists.id', ondelete='CASCADE'), primary_key=True),
    Column('stock_id', Integer, ForeignKey('stocks.id', ondelete='CASCADE'), primary_key=True),
    Column('added_date', DateTime, default=datetime.utcnow)
)


class Stock(Base):
    """
    Master stock symbols table - completely dynamic
    Users can add/remove any stock symbol
    """
    __tablename__ = 'stocks'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    exchange = Column(String(20), default='NSE')  # NSE, BSE, etc.
    sector = Column(String(50), nullable=True)
    added_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    watchlists = relationship(
        'Watchlist',
        secondary=watchlist_stocks,
        back_populates='stocks'
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'symbol': self.symbol,
            'name': self.name,
            'exchange': self.exchange,
            'sector': self.sector,
            'added_date': self.added_date.isoformat() if self.added_date else None,
            'is_active': self.is_active
        }


class Watchlist(Base):
    """
    Dynamic watchlists - users can create unlimited watchlists
    Each watchlist can contain any stocks from the master list
    """
    __tablename__ = 'watchlists'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stocks = relationship(
        'Stock',
        secondary=watchlist_stocks,
        back_populates='watchlists'
    )
    
    def to_dict(self, include_stocks=False):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_date': self.created_date.isoformat() if self.created_date else None,
            'updated_date': self.updated_date.isoformat() if self.updated_date else None,
            'stock_count': len(self.stocks)
        }
        
        if include_stocks:
            data['stocks'] = [stock.to_dict() for stock in self.stocks]
        
        return data


class StrategyMetadata(Base):
    """
    Metadata for strategy scripts - auto-populated by scanning strategy folder
    Each strategy script provides its own metadata
    """
    __tablename__ = 'strategy_metadata'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    script_name = Column(String(100), unique=True, nullable=False, index=True)  # e.g., 'nifty_swing'
    display_name = Column(String(100), nullable=False)  # e.g., 'NIFTY 50 Swing Trading'
    description = Column(Text, nullable=True)
    strategy_type = Column(String(50), default='RULE_BASED')  # RULE_BASED, AI_BASED, HYBRID
    timeframe = Column(String(50), nullable=True)  # Daily, Weekly, Intraday, etc.
    indicators_used = Column(Text, nullable=True)  # JSON string of indicators
    ai_logic = Column(Text, nullable=True)  # Explanation of AI logic
    criteria = Column(Text, nullable=True)  # Strategy entry/exit criteria
    file_path = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    last_scanned = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'script_name': self.script_name,
            'display_name': self.display_name,
            'description': self.description,
            'strategy_type': self.strategy_type,
            'timeframe': self.timeframe,
            'indicators_used': json.loads(self.indicators_used) if self.indicators_used else [],
            'ai_logic': self.ai_logic,
            'criteria': self.criteria,
            'file_path': self.file_path,
            'is_active': self.is_active,
            'last_scanned': self.last_scanned.isoformat() if self.last_scanned else None
        }


class StrategyResult(Base):
    """
    Store results of strategy execution
    Tracks which stocks matched which strategy and when
    """
    __tablename__ = 'strategy_results'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    strategy_id = Column(Integer, ForeignKey('strategy_metadata.id', ondelete='CASCADE'))
    watchlist_id = Column(Integer, ForeignKey('watchlists.id', ondelete='CASCADE'))
    stock_id = Column(Integer, ForeignKey('stocks.id', ondelete='CASCADE'))
    
    # Analysis results
    matched = Column(Boolean, default=False)
    confidence_score = Column(Float, nullable=True)  # AI confidence (0-100)
    trend_score = Column(Float, nullable=True)  # Strategy-specific score
    reason = Column(Text, nullable=True)  # Why this stock was selected/rejected
    
    # Market data at execution time
    price = Column(Float, nullable=True)
    rsi = Column(Float, nullable=True)
    volume_ratio = Column(Float, nullable=True)
    
    # Metadata
    execution_date = Column(DateTime, default=datetime.utcnow, index=True)
    execution_time_ms = Column(Integer, nullable=True)  # How long the analysis took
    
    # Relationships
    strategy = relationship('StrategyMetadata')
    watchlist = relationship('Watchlist')
    stock = relationship('Stock')
    
    def to_dict(self):
        return {
            'id': self.id,
            'strategy': self.strategy.display_name if self.strategy else None,
            'watchlist': self.watchlist.name if self.watchlist else None,
            'stock': self.stock.symbol if self.stock else None,
            'matched': self.matched,
            'confidence_score': self.confidence_score,
            'trend_score': self.trend_score,
            'reason': self.reason,
            'price': self.price,
            'rsi': self.rsi,
            'volume_ratio': self.volume_ratio,
            'execution_date': self.execution_date.isoformat() if self.execution_date else None,
            'execution_time_ms': self.execution_time_ms
        }