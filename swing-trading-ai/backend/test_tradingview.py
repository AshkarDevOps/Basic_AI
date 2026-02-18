"""
Test TradingView Screener - Check Available Fields
"""
from tradingview_screener import Query, Column

print("\n" + "="*80)
print("🔍 TRADINGVIEW SCREENER - FIELD DISCOVERY")
print("="*80)

# Test with a single known stock
test_symbols = ["RELIANCE", "TCS", "INFY"]

try:
    # Query with common technical indicators
    q = (
        Query()
        .set_markets("india")
        .select(
            "name",
            "close",
            "volume",
            "change",
            "Recommend.All",
            # Try different EMA variations
            "EMA5",
            "EMA10", 
            "EMA20",
            "EMA50",
            "EMA100",
            "EMA200",
            # RSI
            "RSI",
            "RSI7",
            # Volume
            "relative_volume_10d_calc",
            "VWAP",
            # MACD
            "MACD.macd",
            "MACD.signal",
            # Moving Averages
            "SMA20",
            "SMA50",
            "SMA200",
            # Other indicators
            "ADX",
            "BB.upper",
            "BB.lower",
            "Stoch.K",
            "Stoch.D"
        )
        .where(
            Column("exchange") == "NSE",
            Column("name").isin(test_symbols)
        )
    )
    
    count, df = q.get_scanner_data()
    
    print(f"\n✅ Successfully retrieved data for {count} stocks")
    print(f"\n📊 Available Columns ({len(df.columns)}):")
    print("="*80)
    
    for i, col in enumerate(df.columns, 1):
        print(f"{i:3d}. {col}")
    
    print("\n" + "="*80)
    print("📈 Sample Data (First Stock):")
    print("="*80)
    
    if not df.empty:
        first_stock = df.iloc[0]
        for col in df.columns:
            value = first_stock[col]
            print(f"{col:30s}: {value}")
    
    print("\n" + "="*80)
    print("💾 Full DataFrame:")
    print("="*80)
    print(df.to_string())
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    print("\nTrying to get ALL available fields...")
    
    # Fallback: Try with minimal selection
    try:
        q2 = Query().set_markets("india").where(
            Column("exchange") == "NSE",
            Column("name") == "RELIANCE"
        )
        
        count2, df2 = q2.get_scanner_data()
        print(f"\n✅ Retrieved {len(df2.columns)} columns")
        print("Available fields:")
        for col in sorted(df2.columns):
            print(f"  - {col}")
            
    except Exception as e2:
        print(f"❌ Fallback also failed: {str(e2)}")

print("\n" + "="*80)