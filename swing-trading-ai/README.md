# 🚀 AI-Based Swing Trading Stock Selection Software - Phase 1

A fully dynamic, AI-powered stock selection platform with **zero static configurations**. Everything is database-driven and automatically discovered.

## 🎯 Core Features

### ✅ Phase 1 Implementation (Complete)

1. **Dynamic Stock Management**
   - Add/remove any stock symbol via API
   - No hardcoded stock lists
   - All stocks stored in SQLite

2. **Unlimited Watchlists**
   - Create unlimited custom watchlists
   - Add/remove stocks from any watchlist
   - Delete watchlists anytime
   - Many-to-many relationships

3. **Auto-Discovery Strategy System**
   - Drop any `.py` strategy file into `strategies/` folder
   - System automatically detects and loads it
   - No manual registration required
   - Displays full metadata in UI

4. **AI-Based Analysis**
   - Modular AI scoring system
   - Confidence scores for each stock
   - Pattern recognition ready
   - Trend strength analysis

5. **Full Database Storage**
   - SQLite for all data
   - Execution results tracking
   - Historical analysis storage
   - Zero static data

---

## 📁 Project Structure

```
swing-trading-ai/
├── backend/
│   ├── app.py                    # Main FastAPI application
│   ├── requirements.txt          # Python dependencies
│   │
│   ├── database/
│   │   ├── db.py                # Database connection & init
│   │   └── models.py            # SQLAlchemy models
│   │
│   ├── strategies/
│   │   ├── __init__.py
│   │   ├── base_strategy.py     # Base class for all strategies
│   │   └── nifty_swing.py       # Sample strategy (your converted script)
│   │
│   └── api/
│       ├── stocks.py            # Stock management endpoints
│       ├── watchlists.py        # Watchlist endpoints
│       └── strategies.py        # Strategy execution endpoints
│
├── database/
│   └── trading.db               # SQLite database (auto-created)
│
└── README.md                     # This file
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.9+
- pip

### Step 1: Install Dependencies

```bash
cd swing-trading-ai/backend
pip install -r requirements.txt
```

### Step 2: Initialize Database

The database is automatically created on first run. To manually initialize:

```bash
python -c "from database.db import init_db; init_db()"
```

### Step 3: Start Backend Server

```bash
python app.py
```

Or with uvicorn directly:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: **http://localhost:8000**

### Step 4: Access API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 📡 API Reference

### 🔹 Stock Management (`/api/stocks`)

#### Add Stock
```bash
POST /api/stocks/
{
  "symbol": "RELIANCE",
  "name": "Reliance Industries",
  "exchange": "NSE",
  "sector": "Energy"
}
```

#### Add Multiple Stocks (Bulk)
```bash
POST /api/stocks/bulk
{
  "stocks": ["RELIANCE", "TCS", "INFY", "HDFCBANK"],
  "exchange": "NSE"
}
```

#### Get All Stocks
```bash
GET /api/stocks/?active_only=true
```

#### Delete Stock
```bash
DELETE /api/stocks/{stock_id}
DELETE /api/stocks/symbol/{symbol}
```

---

### 🔹 Watchlist Management (`/api/watchlists`)

#### Create Watchlist
```bash
POST /api/watchlists/
{
  "name": "Tech Stocks",
  "description": "IT and Technology sector"
}
```

#### Get All Watchlists
```bash
GET /api/watchlists/?include_stocks=true
```

#### Add Stocks to Watchlist (by IDs)
```bash
POST /api/watchlists/{watchlist_id}/stocks
{
  "stock_ids": [1, 2, 3, 4]
}
```

#### Add Stocks to Watchlist (by Symbols)
```bash
POST /api/watchlists/{watchlist_id}/stocks/by-symbol
{
  "symbols": ["RELIANCE", "TCS", "INFY"]
}
```

#### Remove Stock from Watchlist
```bash
DELETE /api/watchlists/{watchlist_id}/stocks/{stock_id}
```

#### Delete Watchlist
```bash
DELETE /api/watchlists/{watchlist_id}
```

#### Get Watchlist Stocks
```bash
GET /api/watchlists/{watchlist_id}/stocks
```

---

### 🔹 Strategy Management (`/api/strategies`)

#### Scan for New Strategies
```bash
POST /api/strategies/scan
```
This auto-discovers all `.py` files in the `strategies/` folder.

#### Get All Strategies
```bash
GET /api/strategies/?active_only=true
```

Response:
```json
[
  {
    "id": 1,
    "script_name": "nifty_swing",
    "display_name": "NIFTY 50 A+ Swing Trading",
    "description": "Advanced swing trading strategy...",
    "strategy_type": "AI_BASED",
    "timeframe": "Daily + Weekly",
    "indicators_used": ["EMA20", "EMA50", "EMA200", "RSI"],
    "criteria": "Entry Criteria: ...",
    "ai_logic": "AI Scoring System: ..."
  }
]
```

#### Get Strategy Details
```bash
GET /api/strategies/{strategy_id}
```

#### Execute Strategy on Watchlist
```bash
POST /api/strategies/execute
{
  "watchlist_id": 1,
  "strategy_id": 1,
  "save_results": true
}
```

Response:
```json
{
  "strategy_name": "NIFTY 50 A+ Swing Trading",
  "watchlist_name": "Tech Stocks",
  "total_stocks": 10,
  "matched_stocks": 3,
  "execution_time_ms": 2340,
  "results": [
    {
      "Stock": "RELIANCE",
      "Matched": true,
      "Score": 85,
      "Confidence": 87.5,
      "Reason": "Strong bullish trend (Score: 85), Entry at EMA20, RSI: 58.3",
      "Price": 2456.75,
      "RSI": 58.3,
      "RVOL": 1.45,
      "Trend": "🟢 STRONG BULLISH"
    }
  ]
}
```

#### Get Latest Results
```bash
GET /api/strategies/results/latest?strategy_id=1&matched_only=true
```

---

## 🧠 Creating New Strategies

### Step 1: Create Strategy File

Create a new `.py` file in `backend/strategies/` folder (e.g., `ema_crossover.py`)

### Step 2: Implement Strategy Class

```python
from strategies.base_strategy import AIBaseStrategy
import pandas as pd

class EMACrossoverStrategy(AIBaseStrategy):
    """
    EMA Crossover Strategy with AI Scoring
    """
    
    # === METADATA (Required) ===
    SCRIPT_NAME = "ema_crossover"
    DISPLAY_NAME = "EMA Crossover Strategy"
    DESCRIPTION = "Identifies bullish/bearish crossovers on EMA20/EMA50"
    STRATEGY_TYPE = "AI_BASED"  # or "RULE_BASED"
    TIMEFRAME = "Daily"
    INDICATORS_USED = ["EMA20", "EMA50", "Volume"]
    
    CRITERIA = """
    Entry: EMA20 crosses above EMA50 with volume confirmation
    Exit: EMA20 crosses below EMA50
    """
    
    AI_LOGIC = """
    Confidence based on:
    - Strength of crossover
    - Volume surge
    - Trend momentum
    """
    
    def analyze(self, stocks: list) -> pd.DataFrame:
        """
        Main analysis method - MUST be implemented
        
        Returns DataFrame with columns:
        - Stock, Matched, Score, Confidence, Reason, Price, RSI, etc.
        """
        
        # Your strategy logic here
        # Fetch data, calculate indicators, apply criteria
        
        results = pd.DataFrame({
            'Stock': stocks,
            'Matched': [True, False, ...],
            'Score': [85, 45, ...],
            'Confidence': [88, 40, ...],
            'Reason': ["Bullish crossover", "No signal", ...]
        })
        
        return results
```

### Step 3: Auto-Discovery

The system automatically detects your strategy when:
1. You add the file to `strategies/` folder
2. Server restarts (auto-scans on startup)
3. OR you call `POST /api/strategies/scan` endpoint

### Step 4: Use in UI

Your strategy will appear in the frontend dropdown with full metadata!

---

## 📊 Database Schema

### Tables

**stocks**
- id, symbol, name, exchange, sector, added_date, is_active

**watchlists**
- id, name, description, created_date, updated_date

**watchlist_stocks** (Many-to-Many)
- watchlist_id, stock_id, added_date

**strategy_metadata**
- id, script_name, display_name, description, strategy_type, timeframe, indicators_used, ai_logic, criteria, file_path, is_active, last_scanned

**strategy_results**
- id, strategy_id, watchlist_id, stock_id, matched, confidence_score, trend_score, reason, price, rsi, volume_ratio, execution_date, execution_time_ms

---

## 🔄 Typical Workflow

### 1. Setup Stocks
```bash
# Add stocks in bulk
POST /api/stocks/bulk
{
  "stocks": ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"]
}
```

### 2. Create Watchlist
```bash
# Create watchlist
POST /api/watchlists/
{"name": "My Favorites"}

# Add stocks to watchlist
POST /api/watchlists/1/stocks/by-symbol
{"symbols": ["RELIANCE", "TCS", "INFY"]}
```

### 3. Execute Strategy
```bash
# Run strategy on watchlist
POST /api/strategies/execute
{
  "watchlist_id": 1,
  "strategy_id": 1,
  "save_results": true
}
```

### 4. Review Results
Frontend displays matched stocks with:
- Match status
- Confidence score
- Trend score
- Reason for selection
- Price and indicators

---

## 🎨 Frontend Integration Guide

### Get Data for Dropdowns

**Stock Symbols Dropdown:**
```javascript
const stocks = await fetch('/api/stocks/').then(r => r.json());
// stocks = [{ id: 1, symbol: "RELIANCE", ... }, ...]
```

**Watchlist Dropdown:**
```javascript
const watchlists = await fetch('/api/watchlists/').then(r => r.json());
// watchlists = [{ id: 1, name: "Tech Stocks", stock_count: 5 }, ...]
```

**Strategy Dropdown:**
```javascript
const strategies = await fetch('/api/strategies/').then(r => r.json());
// strategies = [{ id: 1, display_name: "NIFTY Swing", description: "...", ... }]
```

### Display Strategy Details

When user selects a strategy:
```javascript
const strategy = await fetch(`/api/strategies/${strategyId}`).then(r => r.json());

// Show in UI:
console.log(strategy.display_name);
console.log(strategy.description);
console.log(strategy.strategy_type);  // AI_BASED or RULE_BASED
console.log(strategy.timeframe);
console.log(strategy.indicators_used);  // Array
console.log(strategy.criteria);  // Entry/exit rules
console.log(strategy.ai_logic);  // AI explanation
```

### Execute Analysis

```javascript
const result = await fetch('/api/strategies/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    watchlist_id: selectedWatchlistId,
    strategy_id: selectedStrategyId,
    save_results: true
  })
}).then(r => r.json());

// result.results = array of analyzed stocks
const matchedStocks = result.results.filter(r => r.Matched);
```

---

## 🧪 Testing

### Test Sample Strategy

```bash
cd backend/strategies
python nifty_swing.py
```

This runs the strategy standalone with test stocks.

### Test API

```bash
# Health check
curl http://localhost:8000/health

# Get system stats
curl http://localhost:8000/api/stats
```

---

## 🔒 Security Notes

**For Production:**
1. Update CORS settings in `app.py` to specific domains
2. Add authentication middleware
3. Use environment variables for sensitive config
4. Enable HTTPS
5. Add rate limiting

---

## 🚀 Future Enhancements (Phase 2+)

- [ ] Backtesting engine
- [ ] Real-time market data integration
- [ ] ML model training interface
- [ ] Auto-ranking system
- [ ] Telegram/Email alerts
- [ ] Risk management module
- [ ] Portfolio tracking
- [ ] Multi-timeframe analysis
- [ ] Advanced pattern recognition
- [ ] Sentiment analysis integration

---

## 🐛 Troubleshooting

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
python -c "from database.db import reset_db; reset_db()"
```

### Strategy Not Appearing
```bash
# Manual strategy scan
curl -X POST http://localhost:8000/api/strategies/scan
```

### Port Already in Use
```bash
# Use different port
uvicorn app:app --port 8001
```

---

## 📞 Support

For issues or questions:
1. Check API docs: http://localhost:8000/docs
2. Review logs in terminal
3. Check database: `sqlite3 database/trading.db`

---

## ✅ Success Checklist

- [x] Dynamic stock management (no hardcoded lists)
- [x] Unlimited watchlists with many-to-many relationships
- [x] Auto-discovery of strategy scripts
- [x] Strategy metadata display
- [x] AI-based analysis with confidence scores
- [x] Database storage for all data
- [x] RESTful API with full CRUD
- [x] Watchlist + Strategy execution flow
- [x] Results tracking
- [x] Swagger documentation

---

**Built with ❤️ for swing traders**