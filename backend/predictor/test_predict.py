from prophet import Prophet  
import pytest
from predict import PricePredictor
from datetime import datetime, timedelta
# from datetime import datetime, timede/lta
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

@pytest.fixture
def predictor():
    return PricePredictor()

@pytest.fixture
def sample_history():
    return [
        {'ds': datetime(2023,1,1), 'y': 100},
        {'ds': datetime(2023,1,2), 'y': 105},
        {'ds': datetime(2023,1,3), 'y': 103},
        {'ds': datetime(2023,1,4), 'y': 107},
        {'ds': datetime(2023,1,5), 'y': 110}
    ]

def test_predictor_initialization(predictor):
    assert hasattr(predictor, 'model')
    assert isinstance(predictor.model, Prophet)

def test_prepare_data(predictor, sample_history):
    df = predictor.prepare_data(sample_history)
    assert list(df.columns) == ['ds', 'y']
    assert len(df) == 5

def test_predict_prices(predictor, sample_history):
    result = predictor.predict_prices(sample_history)
    assert 'dates' in result
    assert 'prices' in result
    assert 'recommendation' in result
    assert result['recommendation'] in ['buy', 'wait']
    assert 0 <= result['confidence'] <= 1

def test_insights(predictor, sample_history):
    insights = predictor.get_price_insights(sample_history)
    assert insights['current_price'] == 110
    assert insights['average_price'] == pytest.approx(105)
    assert insights['highest_price'] == 110
    assert insights['lowest_price'] == 100

def generate_test_data(days=30, base_price=100):
    """Generate synthetic price data for testing"""
    dates = [datetime.now() - timedelta(days=x) for x in range(days)]
    prices = base_price + np.cumsum(np.random.normal(0, 2, days))
    return [{'ds': d, 'y': p} for d, p in zip(dates, prices)]

if __name__ == "__main__":
    # Initialize predictor
    predictor = PricePredictor()
    
    # Generate test data
    history = generate_test_data()
    
    print("\n=== Testing Prediction ===")
    prediction = predictor.predict_prices(history)
    print("Next 7 days prediction:", prediction)
    
    print("\n=== Testing Insights ===")
    insights = predictor.get_price_insights(history)
    print("Price insights:", insights)
    
    print("\n=== Visualizing Forecast ===")
    predictor.plot_forecast(history)
    plt.show()  # This will display the plot