import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
import random
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def checkin_ai_users():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🎯 Checking in AI users to random venues...")
    
    # Get AI users
    ai_users = await db.users.find({"isAI": True}).to_list(100)
    print(f"Found {len(ai_users)} AI users")
    
    # Get venues
    venues = await db.venues.find().to_list(100)
    print(f"Found {len(venues)} venues")
    
    if not ai_users or not venues:
        print("No AI users or venues found!")
        client.close()
        return
    
    # Clear existing AI checkins
    await db.checkins.delete_many({"userId": {"$in": [str(u['_id']) for u in ai_users]}})
    
    # Distribute AI users across venues
    popular_venues = random.sample(venues, min(5, len(venues)))
    
    checked_in = 0
    for venue in popular_venues:
        # Check in 1-3 AI users to each popular venue
        num_users = random.randint(1, 3)
        selected_users = random.sample(ai_users, min(num_users, len(ai_users)))
        
        for user in selected_users:
            checkin_data = {
                "userId": str(user['_id']),
                "venueId": str(venue['_id']),
                "checkedInAt": datetime.utcnow(),
                "expiresAt": datetime.utcnow() + timedelta(hours=6)
            }
            await db.checkins.insert_one(checkin_data)
            checked_in += 1
            print(f"   ✓ {user['displayName']} checked in to {venue['name']}")
    
    print(f"\n🎉 Checked in {checked_in} AI users to {len(popular_venues)} venues!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(checkin_ai_users())
