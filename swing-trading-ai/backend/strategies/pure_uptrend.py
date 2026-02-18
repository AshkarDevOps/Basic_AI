"""
Pure Uptrend Strategy - Works with tradingview-screener 3.0+
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from strategies.base_strategy import BaseStrategy
import pandas as pd
import json

try:
    from tradingview_screener import Query, Column
    TRADINGVIEW_AVAILABLE = True
except ImportError:
    TRADINGVIEW_AVAILABLE = False


class PureUptrendStrategy(BaseStrategy):
    
    @classmethod
    def get_metadata(cls) -> dict:
        return {
            'script_name': 'pure_uptrend.py',
            'display_name': 'Pure Uptrend Filter',
            'description': 'Price > EMA20 > EMA50 > EMA200',
            'strategy_type': 'RULE_BASED',
            'timeframe': 'Daily',
            'indicators_used': json.dumps(['EMA20', 'EMA50', 'EMA200']),
            'ai_logic': 'TradingView Screener',
            'criteria': 'Perfect EMA Alignment'
        }
    
    def analyze(self, stock_symbols: list) -> pd.DataFrame:
        print(f"\n📈 Analyzing {len(stock_symbols)} stocks...")
        
        if not TRADINGVIEW_AVAILABLE:
            return pd.DataFrame([{
                'Stock': s, 'Matched': False, 'Score': 0,
                'Confidence': 0.0, 'Reason': 'Library not available'
            } for s in stock_symbols])
        
        # Remove .NS/.BO for TradingView
        tv_symbols = [s.replace('.NS', '').replace('.BO', '') for s in stock_symbols]
        
        try:
            # Query TradingView
            query = (Query()
                .set_markets('india')
                .select('name', 'close', 'EMA20', 'EMA50', 'EMA200')
                .where(
                    Column('exchange') == 'NSE',
                    Column('name').isin(tv_symbols)
                )
            )
            
            count, df = query.get_scanner_data()
            
            results = []
            
            if count > 0 and df is not None:
                print(f"✅ Got data for {len(df)} stocks")
                
                for original_symbol in stock_symbols:
                    tv_name = original_symbol.replace('.NS', '').replace('.BO', '')
                    stock_data = df[df['name'] == tv_name]
                    
                    if not stock_data.empty:
                        row = stock_data.iloc[0]
                        
                        price = float(row.get('close', 0))
                        ema20 = float(row.get('EMA20', 0))
                        ema50 = float(row.get('EMA50', 0))
                        ema200 = float(row.get('EMA200', 0))
                        
                        if price and ema20 and ema50 and ema200:
                            is_uptrend = (price > ema20 > ema50 > ema200)
                            
                            results.append({
                                'Stock': original_symbol,
                                'Matched': is_uptrend,
                                'Score': 100 if is_uptrend else 0,
                                'Confidence': 95.0 if is_uptrend else 10.0,
                                'Reason': f"{'✅ UPTREND' if is_uptrend else '❌ NOT UPTREND'}",
                                'Price': round(price, 2)
                            })
                        else:
                            results.append({
                                'Stock': original_symbol, 'Matched': False, 'Score': 0,
                                'Confidence': 0.0, 'Reason': 'Invalid data', 'Price': None
                            })
                    else:
                        results.append({
                            'Stock': original_symbol, 'Matched': False, 'Score': 0,
                            'Confidence': 0.0, 'Reason': 'Not found', 'Price': None
                        })
            else:
                results = [{
                    'Stock': s, 'Matched': False, 'Score': 0,
                    'Confidence': 0.0, 'Reason': 'No data', 'Price': None
                } for s in stock_symbols]
            
        except Exception as e:
            print(f"❌ Error: {e}")
            results = [{
                'Stock': s, 'Matched': False, 'Score': 0,
                'Confidence': 0.0, 'Reason': f'Error: {str(e)[:50]}', 'Price': None
            } for s in stock_symbols]
        
        result_df = pd.DataFrame(results)
        matched = result_df['Matched'].sum()
        print(f"✅ Done: {matched}/{len(result_df)} uptrends\n")
        return result_df


# Test
if __name__ == "__main__":
    print("="*80)
    print("TEST")
    print("="*80)
    
    strategy = PureUptrendStrategy()
    
    print("\n1. Metadata:")
    print(strategy.get_metadata())
    
    if TRADINGVIEW_AVAILABLE:
        print("\n2. Analysis:")
        results = strategy.analyze(['RELIANCE.NS', 'TCS.NS', 'INFY.NS'])
        print(results)
    else:
        print("\n⚠️  TradingView library not available")