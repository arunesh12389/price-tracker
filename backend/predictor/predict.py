from prophet import Prophet
import matplotlib.pyplot as plt
import pandas as pd
from typing import List, Dict
from datetime import datetime, timedelta
import numpy as np

class PricePredictor:
    def __init__(self):
        self.model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
            changepoint_prior_scale=0.05
        )

    def prepare_data(self, history: List[Dict]) -> pd.DataFrame:
        """Convert price history to Prophet-compatible DataFrame."""
        df = pd.DataFrame(history)
        df.columns = ['ds', 'y']  # Prophet requires these column names
        return df

    def predict_prices(self, history: List[Dict], days_ahead: int = 7) -> Dict:
        """Predict future prices and provide buy/wait recommendation."""
        if len(history) < 5:
            raise ValueError("Insufficient price history for prediction")

        # Prepare data
        df = self.prepare_data(history)
        
        # Fit model
        self.model.fit(df)
        
        # Create future dates for prediction
        future_dates = self.model.make_future_dataframe(periods=days_ahead)
        forecast = self.model.predict(future_dates)
        
        # Extract relevant prediction data
        current_price = df['y'].iloc[-1]
        predicted_prices = forecast['yhat'].tail(days_ahead).values
        predicted_dates = forecast['ds'].tail(days_ahead).dt.strftime('%Y-%m-%d').values
        
        # Calculate trend and confidence
        price_trend = np.mean(np.diff(predicted_prices))
        forecast_std = np.std(predicted_prices)
        current_std = np.std(df['y'].values)
        confidence = 1 - min(forecast_std / current_std, 0.9)  # Cap at 90% confidence
        
        # Determine buy/wait recommendation
        min_predicted_price = np.min(predicted_prices)
        price_drop_expected = min_predicted_price < current_price
        significant_drop = (current_price - min_predicted_price) / current_price > 0.05
        
        recommendation = 'wait' if price_drop_expected and significant_drop else 'buy'
        
        return {
            'dates': predicted_dates.tolist(),
            'prices': predicted_prices.tolist(),
            'recommendation': recommendation,
            'confidence': float(confidence)
        }
    def plot_forecast(self, history: List[Dict], days_ahead: int = 7):

        df = self.prepare_data(history)
        self.model.fit(df)
        future = self.model.make_future_dataframe(periods=days_ahead)
        forecast = self.model.predict(future)
        fig = self.model.plot(forecast)
        ax = fig.gca()
        ax.set_title('Price Forecast')
        ax.set_xlabel('Date')
        ax.set_ylabel('Price ($)')
        plt.tight_layout()
        return fig

    def get_price_insights(self, history: List[Dict]) -> Dict:
        """Generate additional insights about price patterns."""
        df = self.prepare_data(history)
        
        current_price = df['y'].iloc[-1]
        avg_price = df['y'].mean()
        max_price = df['y'].max()
        min_price = df['y'].min()
        
        return {
            'current_price': current_price,
            'average_price': avg_price,
            'highest_price': max_price,
            'lowest_price': min_price,
            'price_volatility': df['y'].std(),
            'total_price_change': (current_price - df['y'].iloc[0]) / df['y'].iloc[0] * 100
        }


        