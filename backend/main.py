from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import uvicorn

from scraper.amazon_scraper import AmazonScraper
from scraper.flipkart_scraper import FlipkartScraper
from predictor.predict import PricePredictor
from database.db import Database
from alerts.notifier import Notifier

app = FastAPI(title="Smart Price Tracker API")

# Enable CORS for Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
db = Database()
predictor = PricePredictor()
notifier = Notifier()

class PriceHistory(BaseModel):
    date: datetime
    price: float

class PricePrediction(BaseModel):
    dates: List[str]
    prices: List[float]
    recommendation: str
    confidence: float

class TrackRequest(BaseModel):
    url: str
    name: str
    price: float
    threshold: float
    last_checked: Optional[str] = None

class TrackingResponse(BaseModel):
    status: str
    product_id: str
    prediction: Optional[PricePrediction] = None
    current_price: Optional[float] = None

@app.get("/")
def root():
    return {"message": "FastAPI is working!"}

@app.get("/api/price")
async def get_current_price(url: str):
    try:
        if 'amazon' in url:
            scraper = AmazonScraper()
        elif 'flipkart' in url:
            scraper = FlipkartScraper()
        else:
            raise HTTPException(status_code=400, detail="Unsupported website")
            
        price = await scraper.get_price(url)
        return {"price": price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/track", response_model=TrackingResponse)
async def track_product(request: TrackRequest):
    try:
        # Store product and get current price
        product_id = await db.add_tracked_product(
            url=request.url,
            name=request.name,
            threshold=request.threshold,
            current_price=request.price
        )
        
        # Add initial price to history
        await db.update_price(request.url, request.price)
        
        # Get history and generate prediction
        history = await db.get_price_history(request.url)
        prediction = predictor.predict_prices(history)
        
        # Check for price alerts
        if request.price <= request.threshold:
            await notifier.send_alert(
                product_id=product_id,
                product_name=request.name,
                current_price=request.price,
                threshold=request.threshold
            )
        
        return {
            "status": "success",
            "product_id": str(product_id),
            "prediction": prediction,
            "current_price": request.price
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_price_history(url: str) -> List[PriceHistory]:
    try:
        history = await db.get_price_history(url)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predict")
async def predict_price(url: str) -> PricePrediction:
    try:
        history = await db.get_price_history(url)
        prediction = predictor.predict_prices(history)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)