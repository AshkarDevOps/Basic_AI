"""
Base Strategy Class
All trading strategies must inherit from this abstract class
"""

from abc import ABC, abstractmethod
import pandas as pd
import importlib.util
import os


class BaseStrategy(ABC):
    """
    Abstract base class for all trading strategies
    
    All strategies must:
    1. Inherit from BaseStrategy
    2. Implement get_metadata() classmethod
    3. Implement analyze() method
    """
    
    @classmethod
    @abstractmethod
    def get_metadata(cls) -> dict:
        """
        Return strategy metadata for database registration
        
        REQUIRED fields:
        - script_name (str): Filename of the strategy (e.g., 'my_strategy.py')
        - display_name (str): User-friendly name shown in UI
        - description (str): What the strategy does
        - strategy_type (str): 'RULE_BASED' or 'AI_BASED'
        - timeframe (str): Trading timeframe (e.g., 'Daily', '1H', '15m')
        - indicators_used (str): JSON string of indicators (e.g., '["RSI", "MACD"]')
        - ai_logic (str): Description of AI/ML logic (empty if rule-based)
        - criteria (str): Entry/exit criteria explanation
        
        Returns:
            dict: Strategy metadata
            
        Example:
            return {
                'script_name': 'ema_crossover.py',
                'display_name': 'EMA Crossover Strategy',
                'description': 'Trades based on EMA20/EMA50 crossovers',
                'strategy_type': 'RULE_BASED',
                'timeframe': 'Daily',
                'indicators_used': '["EMA20", "EMA50"]',
                'ai_logic': '',
                'criteria': 'Buy when EMA20 crosses above EMA50'
            }
        """
        pass
    
    @abstractmethod
    def analyze(self, symbols: list) -> pd.DataFrame:
        """
        Analyze a list of stock symbols and return results
        
        Args:
            symbols (list): List of stock symbols to analyze (e.g., ['RELIANCE.NS', 'TCS.NS'])
            
        Returns:
            pd.DataFrame: Results with REQUIRED columns:
                - Stock (str): Stock symbol
                - Matched (bool): True if stock matches strategy criteria
                - Score (int): Score 0-100 indicating signal strength
                - Confidence (float): Confidence level 0-100
                - Reason (str): Explanation of why it matched/didn't match
                
            Optional columns you can add:
                - Price (float): Current stock price
                - RSI (float): RSI value
                - Volume (int): Volume data
                - Any other relevant metrics
                
        Example:
            return pd.DataFrame([
                {
                    'Stock': 'RELIANCE.NS',
                    'Matched': True,
                    'Score': 85,
                    'Confidence': 90.0,
                    'Reason': 'Strong uptrend with RSI at 65',
                    'Price': 2500.50
                },
                {
                    'Stock': 'TCS.NS',
                    'Matched': False,
                    'Score': 30,
                    'Confidence': 40.0,
                    'Reason': 'No clear trend',
                    'Price': 3200.75
                }
            ])
        """
        pass


def load_strategy_class(file_path: str):
    """
    Dynamically load a strategy class from a Python file
    
    This function:
    1. Loads the Python module from the given file path
    2. Searches for a class that inherits from BaseStrategy
    3. Returns the strategy class (not an instance)
    
    Args:
        file_path (str): Full path to the strategy .py file
        
    Returns:
        class: The strategy class found in the file
        
    Raises:
        ImportError: If the file cannot be loaded
        ValueError: If no BaseStrategy subclass is found
        
    Example:
        strategy_class = load_strategy_class('/path/to/my_strategy.py')
        strategy_instance = strategy_class()
        results = strategy_instance.analyze(['RELIANCE.NS'])
    """
    # Extract module name from file path
    module_name = os.path.basename(file_path).replace('.py', '')
    
    # Load the module from file
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module from {file_path}")
    
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    # Find the strategy class (must inherit from BaseStrategy)
    for item_name in dir(module):
        item = getattr(module, item_name)
        
        # Check if it's a class, inherits from BaseStrategy, and is not BaseStrategy itself
        if (isinstance(item, type) and 
            issubclass(item, BaseStrategy) and 
            item is not BaseStrategy):
            return item
    
    # No strategy class found
    raise ValueError(
        f"No class inheriting from BaseStrategy found in {file_path}. "
        f"Make sure your strategy class inherits from BaseStrategy."
    )


# Helper function for strategy validation
def validate_strategy_result(df: pd.DataFrame) -> bool:
    """
    Validate that a strategy result DataFrame has required columns
    
    Args:
        df (pd.DataFrame): Strategy analysis result
        
    Returns:
        bool: True if valid, raises ValueError if invalid
    """
    required_columns = ['Stock', 'Matched', 'Score', 'Confidence', 'Reason']
    
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        raise ValueError(
            f"Strategy result is missing required columns: {missing_columns}. "
            f"Required columns are: {required_columns}"
        )
    
    return True