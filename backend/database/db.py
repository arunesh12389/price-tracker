from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        # Correct way to access environment variables in Python
        MONGO_URI = os.getenv('MONGO_URI')
        
        if not MONGO_URI:
            raise ValueError("MONGODB_URI not found in environment variables")
        
        print(f"Connecting to MongoDB with URI: {MONGO_URI[:18]}...")  # Log first 20 chars for security
        
        self.client = AsyncIOMotorClient(MONGO_URI)
        self.db = self.client["price_tracker"]
        
        # Verify connection
        try:
            # Ping the server to test connection
            self.client.admin.command('ping')
            print("✅ Successfully connected to MongoDB")
        except Exception as e:
            print("❌ MongoDB connection failed:", str(e))
            raise
        
        # Collections
        self.products = self.db.products
        self.price_history = self.db.price_history
        self.alerts = self.db.alerts

    async def add_tracked_product(self, url: str, threshold: float) -> str:
        """Add a new product to track."""
        product = {
            'url': url,
            'name': name,
            'threshold': threshold,
            'current_price': current_price,
            'created_at': datetime.utcnow(),
            'last_checked': datetime.utcnow(),
            'is_active': True
        }
        
        result = await self.products.update_one(
            {'url': url},
            {'$set': product},
            upsert=True
        )
        
        return str(result.upserted_id) if result.upserted_id else str(result.modified_count)

    async def update_price(self, url: str, price: float) -> None:
        """Add new price point to history."""
        price_point = {
            'url': url,
            'price': price,
            'timestamp': datetime.utcnow()
        }
        
        await self.price_history.insert_one(price_point)
        await self.products.update_one(
            {'url': url},
            {'$set': {'last_checked': datetime.utcnow()}}
        )

    async def get_price_history(self, url: str) -> List[Dict]:
        """Get price history for a product."""
        cursor = self.price_history.find(
            {'url': url},
            {'_id': 0, 'price': 1, 'timestamp': 1}
        ).sort('timestamp', 1)
        
        history = await cursor.to_list(length=None)
        return [{
            'date': item['timestamp'],
            'price': item['price']
        } for item in history]

    async def get_products_to_check(self) -> List[Dict]:
        """Get all active products that need price check."""
        cursor = self.products.find({'is_active': True})
        return await cursor.to_list(length=None)

    async def add_alert(self, url: str, price: float, threshold: float) -> None:
        """Record a price alert."""
        alert = {
            'url': url,
            'price': price,
            'threshold': threshold,
            'timestamp': datetime.utcnow(),
            'notified': False
        }
        
        await self.alerts.insert_one(alert)

    async def get_pending_alerts(self) -> List[Dict]:
        """Get all unnotified alerts."""
        cursor = self.alerts.find({'notified': False})
        return await cursor.to_list(length=None)

    async def mark_alert_notified(self, alert_id: str) -> None:
        """Mark an alert as notified."""
        await self.alerts.update_one(
            {'_id': alert_id},
            {'$set': {'notified': True}}
        )

    async def deactivate_product(self, url: str) -> None:
        """Stop tracking a product."""
        await self.products.update_one(
            {'url': url},
            {'$set': {'is_active': False}}
        )