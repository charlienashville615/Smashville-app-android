import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

# Nashville Venues Data
NASHVILLE_VENUES = [
    # Broadway Honky Tonks
    {"name": "Tootsies Orchid Lounge", "type": "bar", "address": "422 Broadway, Nashville, TN", "description": "Legendary honky tonk on Broadway", "closingTime": "03:00"},
    {"name": "Robert's Western World", "type": "bar", "address": "416 Broadway, Nashville, TN", "description": "Live country music and fried bologna", "closingTime": "03:00"},
    {"name": "The Stage on Broadway", "type": "bar", "address": "412 Broadway, Nashville, TN", "description": "Multi-level bar with live music", "closingTime": "03:00"},
    {"name": "Honky Tonk Central", "type": "bar", "address": "329 Broadway, Nashville, TN", "description": "Four floors of live music", "closingTime": "03:00"},
    {"name": "Kid Rock's Big Ass Honky Tonk & Rock N' Roll Steakhouse", "type": "bar", "address": "221 Broadway, Nashville, TN", "description": "Massive multi-level entertainment venue", "closingTime": "02:00"},
    
    # Music Venues
    {"name": "The Bluebird Cafe", "type": "venue", "address": "4104 Hillsboro Pike, Nashville, TN", "description": "Intimate listening room, famous for songwriters", "closingTime": "23:00"},
    {"name": "Ryman Auditorium", "type": "venue", "address": "116 5th Ave N, Nashville, TN", "description": "The Mother Church of Country Music", "closingTime": "22:00"},
    {"name": "Grand Ole Opry", "type": "venue", "address": "2804 Opryland Dr, Nashville, TN", "description": "Home of country music's greatest show", "closingTime": "22:00"},
    {"name": "Bridgestone Arena", "type": "arena", "address": "501 Broadway, Nashville, TN", "description": "Major concert and sports venue", "closingTime": "23:00"},
    {"name": "The Listening Room Cafe", "type": "venue", "address": "217 2nd Ave S, Nashville, TN", "description": "Songwriter showcases and comfort food", "closingTime": "23:00"},
    
    # Clubs & Nightlife
    {"name": "Skull's Rainbow Room", "type": "club", "address": "222 Printers Alley, Nashville, TN", "description": "Iconic club in Printers Alley", "closingTime": "03:00"},
    {"name": "FGL House", "type": "club", "address": "120 3rd Ave S, Nashville, TN", "description": "Florida Georgia Line's multi-level venue", "closingTime": "02:00"},
    {"name": "The Valentine", "type": "club", "address": "312 Broadway, Nashville, TN", "description": "High-energy nightclub experience", "closingTime": "03:00"},
    {"name": "Tin Roof", "type": "bar", "address": "1516 Demonbreun St, Nashville, TN", "description": "Live music bar in the Gulch", "closingTime": "03:00"},
    
    # Dive Bars & Unique Spots
    {"name": "Santa's Pub", "type": "bar", "address": "2225 Bransford Ave, Nashville, TN", "description": "Double-wide karaoke dive bar", "closingTime": "03:00"},
    {"name": "The 5 Spot", "type": "bar", "address": "1006 Forrest Ave, Nashville, TN", "description": "East Nashville dive with live music", "closingTime": "02:00"},
    {"name": "Dino's Bar", "type": "bar", "address": "411 Gallatin Ave, Nashville, TN", "description": "Neighborhood dive in East Nashville", "closingTime": "03:00"},
    {"name": "The Basement East", "type": "venue", "address": "917 Woodland St, Nashville, TN", "description": "Indie music venue", "closingTime": "02:00"},
    
    # Entertainment & Activities
    {"name": "Pinewood Social", "type": "entertainment", "address": "33 Peabody St, Nashville, TN", "description": "Bowling, pool, and cocktails", "closingTime": "02:00"},
    {"name": "Acme Feed & Seed", "type": "bar", "address": "101 Broadway, Nashville, TN", "description": "Multi-level bar and restaurant", "closingTime": "03:00"},
    {"name": "Assembly Food Hall", "type": "entertainment", "address": "5th + Broadway, Nashville, TN", "description": "Food hall with multiple vendors", "closingTime": "22:00"},
    {"name": "Game Terminal", "type": "arcade", "address": "1203 5th Ave N, Nashville, TN", "description": "Craft beer and vintage arcade games", "closingTime": "02:00"},
    {"name": "No. 308", "type": "bar", "address": "407 Gallatin Ave, Nashville, TN", "description": "Craft cocktails in East Nashville", "closingTime": "02:00"},
    
    # Rooftop Bars
    {"name": "L.A. Jackson", "type": "bar", "address": "401 11th Ave S, Nashville, TN", "description": "Rooftop bar at Thompson Nashville", "closingTime": "02:00"},
    {"name": "The George Jones", "type": "bar", "address": "128 2nd Ave N, Nashville, TN", "description": "Rooftop bar with Broadway views", "closingTime": "03:00"},
    
    # Breweries
    {"name": "Yazoo Brewing Company", "type": "brewery", "address": "910 Division St, Nashville, TN", "description": "Nashville's original craft brewery", "closingTime": "22:00"},
    {"name": "Tennessee Brew Works", "type": "brewery", "address": "809 Ewing Ave, Nashville, TN", "description": "Craft brewery in The Nations", "closingTime": "22:00"},
    {"name": "Bearded Iris Brewing", "type": "brewery", "address": "101 Van Buren St, Nashville, TN", "description": "Hazy IPAs in Sylvan Park", "closingTime": "22:00"},
    
    # Theaters
    {"name": "TPAC - Tennessee Performing Arts Center", "type": "theater", "address": "505 Deaderick St, Nashville, TN", "description": "Broadway shows and performances", "closingTime": "22:00"},
    {"name": "The Belcourt Theatre", "type": "theater", "address": "2102 Belcourt Ave, Nashville, TN", "description": "Independent cinema", "closingTime": "23:00"},
    
    # Parks (for outdoor events)
    {"name": "Centennial Park", "type": "park", "address": "2500 West End Ave, Nashville, TN", "description": "Home of the Parthenon, outdoor concerts", "closingTime": "23:00"},
    {"name": "Bicentennial Capitol Mall", "type": "park", "address": "600 James Robertson Pkwy, Nashville, TN", "description": "Downtown park with events", "closingTime": "21:00"},
]

async def seed_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Starting database seeding...")
    
    # Clear existing data
    print("Clearing existing venues, events, and gifts...")
    await db.venues.delete_many({})
    await db.events.delete_many({})
    await db.gifts.delete_many({})
    
    # Insert venues
    print(f"Inserting {len(NASHVILLE_VENUES)} Nashville venues...")
    venue_data = []
    for v in NASHVILLE_VENUES:
        venue_data.append({
            **v,
            "city": "Nashville",
            "state": "TN",
            "createdAt": datetime.utcnow()
        })
    
    venues_result = await db.venues.insert_many(venue_data)
    print(f"✅ Inserted {len(venues_result.inserted_ids)} venues")
    
    # Create sample events
    print("Creating sample events...")
    venue_ids = list(venues_result.inserted_ids)
    
    events_data = [
        {
            "venueId": str(venue_ids[0]),  # Tootsies
            "name": "Live Country Jam Night",
            "description": "Local country artists performing all night long",
            "eventDate": datetime.utcnow() + timedelta(days=2),
            "eventType": "live music",
            "createdAt": datetime.utcnow()
        },
        {
            "venueId": str(venue_ids[5]),  # Bluebird Cafe
            "name": "Songwriter Showcase",
            "description": "Intimate acoustic performances by Nashville's best writers",
            "eventDate": datetime.utcnow() + timedelta(days=5),
            "eventType": "live music",
            "createdAt": datetime.utcnow()
        },
        {
            "venueId": str(venue_ids[10]),  # Skull's Rainbow Room
            "name": "Saturday Night Dance Party",
            "description": "DJ spinning all your favorite hits",
            "eventDate": datetime.utcnow() + timedelta(days=4),
            "eventType": "party",
            "createdAt": datetime.utcnow()
        },
        {
            "venueId": str(venue_ids[18]),  # Pinewood Social
            "name": "Bowling Tournament",
            "description": "Compete for prizes and bragging rights",
            "eventDate": datetime.utcnow() + timedelta(days=7),
            "eventType": "special",
            "createdAt": datetime.utcnow()
        },
        {
            "venueId": str(venue_ids[30]),  # Centennial Park
            "name": "Outdoor Concert Series",
            "description": "Free live music under the stars",
            "eventDate": datetime.utcnow() + timedelta(days=10),
            "eventType": "live music",
            "createdAt": datetime.utcnow()
        },
    ]
    
    events_result = await db.events.insert_many(events_data)
    print(f"✅ Inserted {len(events_result.inserted_ids)} events")
    
    # Create gifts
    print("Creating gifts...")
    gifts_data = [
        {"name": "Rose", "emoji": "🌹", "giftType": "cute"},
        {"name": "Heart", "emoji": "❤️", "giftType": "cute"},
        {"name": "Drink", "emoji": "🍹", "giftType": "cute"},
        {"name": "Coffee", "emoji": "☕", "giftType": "cute"},
        {"name": "Pizza", "emoji": "🍕", "giftType": "cute"},
        {"name": "Fire", "emoji": "🔥", "giftType": "spicy"},
        {"name": "Peach", "emoji": "🍑", "giftType": "spicy"},
        {"name": "Eggplant", "emoji": "🍆", "giftType": "spicy"},
        {"name": "Kiss", "emoji": "💋", "giftType": "spicy"},
        {"name": "Devil", "emoji": "😈", "giftType": "spicy"},
        {"name": "Wink", "emoji": "😉", "giftType": "cute"},
        {"name": "Heart Eyes", "emoji": "😍", "giftType": "cute"},
    ]
    
    gifts_result = await db.gifts.insert_many(gifts_data)
    print(f"✅ Inserted {len(gifts_result.inserted_ids)} gifts")
    
    print("🎉 Database seeding completed successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
