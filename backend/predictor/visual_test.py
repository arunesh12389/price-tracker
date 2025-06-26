from predict import PricePredictor
from datetime import datetime, timedelta
import numpy as np
import matplotlib.pyplot as plt

def generate_test_data(days=30, base_price=100):
    """Generate synthetic price data"""
    dates = [datetime.now() - timedelta(days=x) for x in range(days)]
    prices = base_price + np.cumsum(np.random.normal(0, 2, days))
    return [{'ds': d, 'y': p} for d, p in zip(dates, prices)]

if __name__ == "__main__":
    # Initialize with full implementation
    predictor = PricePredictor()
    
    # Generate test data
    history = generate_test_data()
    
    # Plot and display
    print("Generating forecast plot...")
    predictor.plot_forecast(history)
    plt.show()  # This will display the plot window
    print("Close the plot window to continue...")