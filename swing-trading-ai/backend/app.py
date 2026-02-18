"""
AI-Based Swing Trading Stock Selection Software - Backend
FastAPI Application with Dynamic Stock, Watchlist, and Strategy Management
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database.db import init_db, engine, get_session
from database.models import Base, Stock, Watchlist, StrategyMetadata, StrategyResult
from api import stocks, watchlists, strategies
from api.strategies import scan_strategy_files, load_strategy_metadata
from datetime import datetime
import uvicorn

# Initialize database
print("Initializing database...")
init_db()

# Create FastAPI app
app = FastAPI(
    title="Swing Trading AI Platform",
    description="AI-Based Stock Selection System with Dynamic Management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration - adjust for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stocks.router)
app.include_router(watchlists.router)
app.include_router(strategies.router)


# === ROOT ENDPOINTS ===

@app.get("/")
async def root():
    """
    API root - system info
    """
    return {
        "name": "Swing Trading AI Platform",
        "version": "1.0.0",
        "status": "operational",
        "features": [
            "Dynamic Stock Management",
            "Unlimited Watchlists",
            "Auto-Discovery Strategy Scripts",
            "AI-Based Analysis",
            "Zero Static Configuration"
        ],
        "endpoints": {
            "stocks": "/api/stocks",
            "watchlists": "/api/watchlists",
            "strategies": "/api/strategies",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "database": "connected"
    }


@app.get("/api/stats")
async def get_system_stats():
    """
    Get system statistics
    """
    db = get_session()
    
    try:
        stats = {
            "stocks": {
                "total": db.query(Stock).count(),
                "active": db.query(Stock).filter(Stock.is_active == True).count()
            },
            "watchlists": {
                "total": db.query(Watchlist).count()
            },
            "strategies": {
                "total": db.query(StrategyMetadata).count(),
                "active": db.query(StrategyMetadata).filter(
                    StrategyMetadata.is_active == True
                ).count()
            },
            "analysis_history": {
                "total_executions": db.query(StrategyResult).count(),
                "total_matches": db.query(StrategyResult).filter(
                    StrategyResult.matched == True
                ).count()
            }
        }
        
        return stats
    finally:
        db.close()


# === ERROR HANDLERS ===

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """
    Custom HTTP exception handler
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """
    General exception handler
    """
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc)
        }
    )


# === HELPER FUNCTION FOR AUTO-REGISTRATION ===

def auto_register_strategies():
    """
    Automatically scan and register all strategy files
    Returns the count of registered strategies
    """
    db = get_session()
    
    try:
        strategy_files = scan_strategy_files()
        
        added = 0
        updated = 0
        errors = []
        
        for file_path in strategy_files:
            try:
                metadata = load_strategy_metadata(file_path)
                
                if not metadata:
                    errors.append(file_path)
                    continue
                
                # Check if strategy already exists
                existing = db.query(StrategyMetadata).filter(
                    StrategyMetadata.script_name == metadata['script_name']
                ).first()
                
                if existing:
                    # Update existing strategy
                    for key, value in metadata.items():
                        if key != 'script_name':
                            setattr(existing, key, value)
                    existing.last_scanned = datetime.utcnow()
                    updated += 1
                    print(f"   🔄 Updated: {metadata['display_name']}")
                else:
                    # Add new strategy
                    new_strategy = StrategyMetadata(
                        **metadata,
                        is_active=True,
                        last_scanned=datetime.utcnow()
                    )
                    db.add(new_strategy)
                    added += 1
                    print(f"   ✅ Registered: {metadata['display_name']}")
            
            except Exception as e:
                errors.append(f"{file_path}: {str(e)}")
                print(f"   ❌ Error loading strategy: {str(e)}")
        
        db.commit()
        
        # Print summary
        if added > 0:
            print(f"\n   📝 Added {added} new strategies")
        if updated > 0:
            print(f"   🔄 Updated {updated} existing strategies")
        if errors:
            print(f"   ⚠️  {len(errors)} errors occurred")
        
        total = db.query(StrategyMetadata).count()
        return total
        
    except Exception as e:
        print(f"   ❌ Error during auto-registration: {str(e)}")
        return 0
    finally:
        db.close()


# === STARTUP/SHUTDOWN EVENTS ===

@app.on_event("startup")
async def startup_event():
    """
    Run on application startup
    """
    print("\n" + "=" * 80)
    print("🚀 SWING TRADING AI PLATFORM - STARTING UP")
    print("=" * 80)
    print("\n✅ Database initialized")
    print("✅ API routes registered")
    print("\n📚 Available endpoints:")
    print("   - Stocks:      /api/stocks")
    print("   - Watchlists:  /api/watchlists")
    print("   - Strategies:  /api/strategies")
    print("   - Docs:        /docs")
    print("\n" + "=" * 80)
    
    # Auto-scan and register strategies on startup
    print("\n🔍 Auto-scanning for strategy scripts...")
    total_strategies = auto_register_strategies()
    print(f"\n✅ Total strategies available: {total_strategies}")
    
    print("=" * 80 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Run on application shutdown
    """
    print("\n" + "=" * 80)
    print("🛑 SWING TRADING AI PLATFORM - SHUTTING DOWN")
    print("=" * 80 + "\n")


# === MAIN EXECUTION ===

if __name__ == "__main__":
    print("\n🚀 Starting Swing Trading AI Platform...\n")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )