"""
Test NIFTY 50 Bullish EMA Strategy with Watchlist
Run this to verify the strategy works with your watchlist stocks
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from strategies.nifty_ema_bullish import NiftyEMABullishStrategy
from database.db import SessionLocal
from database.models import Watchlist, Stock

def test_strategy_with_watchlist():
    """Test strategy with stocks from database watchlist"""
    
    print("\n" + "="*120)
    print("🧪 TESTING NIFTY 50 BULLISH EMA STRATEGY WITH WATCHLIST")
    print("="*120)
    
    # Connect to database
    db = SessionLocal()
    
    try:
        # Get all watchlists
        watchlists = db.query(Watchlist).all()
        
        if not watchlists:
            print("\n❌ No watchlists found in database!")
            print("📝 Please create a watchlist first using the frontend or add one manually.")
            return
        
        print(f"\n📋 Found {len(watchlists)} watchlist(s) in database:")
        for i, wl in enumerate(watchlists, 1):
            stock_count = len(wl.stocks)
            print(f"   {i}. {wl.name} - {stock_count} stocks - {wl.description or 'No description'}")
        
        # Let user choose watchlist or use first one
        if len(watchlists) == 1:
            selected_watchlist = watchlists[0]
            print(f"\n✅ Auto-selected: {selected_watchlist.name}")
        else:
            print("\n🔢 Enter watchlist number to test (or press Enter for first one): ", end='')
            choice = input().strip()
            
            if choice.isdigit() and 1 <= int(choice) <= len(watchlists):
                selected_watchlist = watchlists[int(choice) - 1]
            else:
                selected_watchlist = watchlists[0]
                print(f"✅ Using first watchlist: {selected_watchlist.name}")
        
        # Get stock symbols from watchlist
        stock_symbols = [stock.symbol for stock in selected_watchlist.stocks]
        
        if not stock_symbols:
            print(f"\n❌ Watchlist '{selected_watchlist.name}' has no stocks!")
            print("📝 Please add stocks to the watchlist first.")
            return
        
        print(f"\n📊 Watchlist Details:")
        print(f"   Name: {selected_watchlist.name}")
        print(f"   Description: {selected_watchlist.description or 'None'}")
        print(f"   Total Stocks: {len(stock_symbols)}")
        print(f"   Stock Symbols: {', '.join(stock_symbols)}")
        
        # Initialize strategy
        print("\n🚀 Initializing NIFTY 50 Bullish EMA Strategy...")
        strategy = NiftyEMABullishStrategy()
        
        # Execute strategy
        print("\n" + "="*120)
        results = strategy.analyze(stock_symbols)
        print("="*120)
        
        # Display results
        print("\n📊 DETAILED RESULTS:")
        print("="*120)
        print(results.to_string(index=False))
        print("="*120)
        
        # Summary statistics
        total = len(results)
        buy_signals = results[results['Matched'] == True]
        neutral_avoid = results[results['Matched'] == False]
        
        print("\n📈 SUMMARY:")
        print("="*120)
        print(f"Total Stocks Analyzed:     {total}")
        print(f"🟢 BUY Signals:            {len(buy_signals)}")
        print(f"➖ NEUTRAL/AVOID Signals:  {len(neutral_avoid)}")
        
        if total > 0:
            success_rate = (len(buy_signals) / total) * 100
            print(f"Success Rate:              {success_rate:.1f}%")
        
        # Show BUY signals if any
        if len(buy_signals) > 0:
            print("\n" + "="*120)
            print("🟢 BUY SIGNALS FOUND:")
            print("="*120)
            for idx, row in buy_signals.iterrows():
                print(f"\n📌 {row['Stock']}")
                print(f"   Score:      {row['Score']}")
                print(f"   Confidence: {row['Confidence']:.1f}%")
                print(f"   Trend:      {row['Trend']}")
                print(f"   Price:      ₹{row['Price']:.2f}" if pd.notna(row['Price']) else "   Price:      N/A")
                print(f"   RSI:        {row['RSI']:.1f}" if pd.notna(row['RSI']) else "   RSI:        N/A")
                print(f"   Reason:     {row['Reason']}")
        else:
            print("\n⚠️  No BUY signals in current market conditions")
            print("💡 This is normal - the strategy is conservative and waits for optimal entry points")
        
        # Show trend distribution
        print("\n" + "="*120)
        print("📊 TREND DISTRIBUTION:")
        print("="*120)
        trend_counts = results['Trend'].value_counts()
        for trend, count in trend_counts.items():
            print(f"   {trend}: {count} stocks")
        
        # Show top scored stocks (even if not BUY)
        print("\n" + "="*120)
        print("⭐ TOP 5 HIGHEST SCORED STOCKS:")
        print("="*120)
        top_stocks = results.nlargest(5, 'Score')[['Stock', 'Score', 'Confidence', 'Trend', 'Reason']]
        print(top_stocks.to_string(index=False))
        
        print("\n" + "="*120)
        print("✅ TEST COMPLETED SUCCESSFULLY")
        print("="*120)
        
    except Exception as e:
        print(f"\n❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()


def test_with_manual_stocks():
    """Test strategy with manually specified stocks"""
    
    print("\n" + "="*120)
    print("🧪 TESTING WITH MANUAL STOCK LIST")
    print("="*120)
    
    # Manual stock list for testing
    test_stocks = [
        "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
        "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "BAJFINANCE"
    ]
    
    print(f"\n📊 Testing with {len(test_stocks)} stocks:")
    print(f"   {', '.join(test_stocks)}")
    
    # Initialize and run strategy
    strategy = NiftyEMABullishStrategy()
    
    print("\n🚀 Executing strategy...")
    print("="*120)
    results = strategy.analyze(test_stocks)
    print("="*120)
    
    # Display results
    print("\n📊 RESULTS:")
    print("="*120)
    print(results.to_string(index=False))
    print("="*120)
    
    # Summary
    buy_count = results['Matched'].sum()
    print(f"\n🟢 BUY Signals: {buy_count}/{len(test_stocks)}")
    
    if buy_count > 0:
        print("\n📌 BUY SIGNALS:")
        buy_signals = results[results['Matched'] == True]
        print(buy_signals[['Stock', 'Score', 'Confidence', 'Trend', 'Reason']].to_string(index=False))


if __name__ == "__main__":
    import pandas as pd
    
    print("\n" + "="*120)
    print("🎯 NIFTY 50 BULLISH EMA STRATEGY - TERMINAL TEST")
    print("="*120)
    print("\nChoose test mode:")
    print("  1. Test with database watchlist (recommended)")
    print("  2. Test with manual stock list")
    print("\nEnter choice (1 or 2), or press Enter for option 1: ", end='')
    
    choice = input().strip()
    
    if choice == "2":
        test_with_manual_stocks()
    else:
        test_strategy_with_watchlist()
    
    print("\n")