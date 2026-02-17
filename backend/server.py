from fastapi import FastAPI, APIRouter, HTTPException, Body
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from emergentintegrations import OpenAIClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Client
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
llm_client = OpenAIClient(api_key=EMERGENT_LLM_KEY) if EMERGENT_LLM_KEY else None

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# =============== MODELS ===============

class User(BaseModel):
    id: Optional[str] = None
    email: str
    password: str
    displayName: str
    bio: Optional[str] = ""
    photos: List[str] = []  # base64 images
    coverPhoto: Optional[str] = None  # base64 image
    currentVibe: Optional[str] = "just vibing"
    personalityText: Optional[str] = ""  # AI-generated
    makeItCountText: Optional[str] = ""  # AI-generated
    isPremium: bool = False
    premiumExpiresAt: Optional[datetime] = None
    isAI: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class Venue(BaseModel):
    id: Optional[str] = None
    name: str
    type: str  # bar, club, arena, theater, etc.
    address: str
    city: str = "Nashville"
    state: str = "TN"
    description: Optional[str] = ""
    closingTime: Optional[str] = "02:00"  # 24hr format
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class CheckIn(BaseModel):
    id: Optional[str] = None
    userId: str
    venueId: str
    checkedInAt: datetime = Field(default_factory=datetime.utcnow)
    expiresAt: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=6))

class Swipe(BaseModel):
    id: Optional[str] = None
    userId: str
    targetUserId: str
    venueId: str
    direction: str  # "left" or "right"
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class Match(BaseModel):
    id: Optional[str] = None
    user1Id: str
    user2Id: str
    venueId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    expiresAt: Optional[datetime] = None
    isActive: bool = True

class Message(BaseModel):
    id: Optional[str] = None
    matchId: str
    senderId: str
    content: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class Event(BaseModel):
    id: Optional[str] = None
    venueId: str
    name: str
    description: str
    eventDate: datetime
    eventType: str  # "live music", "party", "special"
    imageUrl: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class RSVP(BaseModel):
    id: Optional[str] = None
    userId: str
    eventId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class Gift(BaseModel):
    id: Optional[str] = None
    name: str
    emoji: str
    giftType: str  # "cute" or "spicy"

class GiftSent(BaseModel):
    id: Optional[str] = None
    fromUserId: str
    toUserId: str
    giftId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

# =============== HELPER FUNCTIONS ===============

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

async def generate_ai_text(prompt: str) -> str:
    """Generate AI text using Emergent LLM"""
    if not llm_client:
        return "Your vibe is immaculate"
    
    try:
        response = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logging.error(f"AI generation error: {e}")
        return "Too cool for a bio"

# =============== AUTH ENDPOINTS ===============

@api_router.post("/auth/signup")
async def signup(user: User):
    # Check if user exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate AI personality texts
    user.personalityText = await generate_ai_text(
        f"Write a short sarcastic, funny one-liner about a person named {user.displayName} for a dating app. Be witty and playful."
    )
    user.makeItCountText = await generate_ai_text(
        "Write a short sarcastic dating app tagline. One sentence max. Be funny and cheeky."
    )
    
    user_dict = user.dict(exclude={'id'})
    result = await db.users.insert_one(user_dict)
    user_dict['id'] = str(result.inserted_id)
    return serialize_doc(user_dict)

@api_router.post("/auth/login")
async def login(email: str = Body(...), password: str = Body(...)):
    user = await db.users.find_one({"email": email, "password": password})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return serialize_doc(user)

# =============== USER ENDPOINTS ===============

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict):
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_doc(user)

@api_router.post("/users/{user_id}/regenerate-ai")
async def regenerate_ai_texts(user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    personality = await generate_ai_text(
        f"Write a short sarcastic, funny one-liner about a person named {user['displayName']} for a dating app. Be witty."
    )
    makeItCount = await generate_ai_text(
        "Write a short sarcastic dating app tagline. One sentence max. Be funny and cheeky."
    )
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"personalityText": personality, "makeItCountText": makeItCount}}
    )
    return {"personalityText": personality, "makeItCountText": makeItCount}

# =============== VENUE ENDPOINTS ===============

@api_router.get("/venues")
async def get_venues(city: str = "Nashville"):
    venues = await db.venues.find({"city": city}).to_list(200)
    return [serialize_doc(v) for v in venues]

@api_router.post("/venues")
async def create_venue(venue: Venue):
    venue_dict = venue.dict(exclude={'id'})
    result = await db.venues.insert_one(venue_dict)
    venue_dict['id'] = str(result.inserted_id)
    return serialize_doc(venue_dict)

@api_router.get("/venues/{venue_id}")
async def get_venue(venue_id: str):
    venue = await db.venues.find_one({"_id": ObjectId(venue_id)})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return serialize_doc(venue)

# =============== CHECK-IN ENDPOINTS ===============

@api_router.post("/checkins")
async def check_in(checkin: CheckIn):
    # Remove any existing check-ins for this user
    await db.checkins.delete_many({"userId": checkin.userId})
    
    # Create new check-in
    checkin_dict = checkin.dict(exclude={'id'})
    result = await db.checkins.insert_one(checkin_dict)
    checkin_dict['id'] = str(result.inserted_id)
    return serialize_doc(checkin_dict)

@api_router.get("/checkins/user/{user_id}")
async def get_user_checkin(user_id: str):
    # Get active check-in
    checkin = await db.checkins.find_one({
        "userId": user_id,
        "expiresAt": {"$gt": datetime.utcnow()}
    })
    return serialize_doc(checkin) if checkin else None

@api_router.get("/checkins/venue/{venue_id}")
async def get_venue_checkins(venue_id: str):
    # Get all active check-ins for venue
    checkins = await db.checkins.find({
        "venueId": venue_id,
        "expiresAt": {"$gt": datetime.utcnow()}
    }).to_list(500)
    
    # Get user details for each check-in
    user_ids = [ObjectId(c['userId']) for c in checkins]
    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(500)
    
    return [serialize_doc(u) for u in users]

@api_router.delete("/checkins/{checkin_id}")
async def checkout(checkin_id: str):
    result = await db.checkins.delete_one({"_id": ObjectId(checkin_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Check-in not found")
    return {"message": "Checked out successfully"}

# =============== SWIPE & MATCH ENDPOINTS ===============

@api_router.post("/swipes")
async def create_swipe(swipe: Swipe):
    # Check if already swiped
    existing = await db.swipes.find_one({
        "userId": swipe.userId,
        "targetUserId": swipe.targetUserId
    })
    if existing:
        return serialize_doc(existing)
    
    swipe_dict = swipe.dict(exclude={'id'})
    result = await db.swipes.insert_one(swipe_dict)
    swipe_dict['id'] = str(result.inserted_id)
    
    # Check for match (if both swiped right)
    if swipe.direction == "right":
        reverse_swipe = await db.swipes.find_one({
            "userId": swipe.targetUserId,
            "targetUserId": swipe.userId,
            "direction": "right"
        })
        
        if reverse_swipe:
            # Create match
            match = Match(
                user1Id=swipe.userId,
                user2Id=swipe.targetUserId,
                venueId=swipe.venueId,
                expiresAt=datetime.utcnow() + timedelta(hours=12)
            )
            match_dict = match.dict(exclude={'id'})
            match_result = await db.matches.insert_one(match_dict)
            return {
                "swipe": serialize_doc(swipe_dict),
                "match": serialize_doc({**match_dict, "_id": match_result.inserted_id})
            }
    
    return serialize_doc(swipe_dict)

@api_router.get("/matches/user/{user_id}")
async def get_user_matches(user_id: str):
    # Get active matches
    matches = await db.matches.find({
        "$or": [{"user1Id": user_id}, {"user2Id": user_id}],
        "isActive": True,
        "$or": [
            {"expiresAt": {"$gt": datetime.utcnow()}},
            {"expiresAt": None}
        ]
    }).to_list(200)
    
    # Get other user details
    result_matches = []
    for match in matches:
        other_user_id = match['user2Id'] if match['user1Id'] == user_id else match['user1Id']
        other_user = await db.users.find_one({"_id": ObjectId(other_user_id)})
        if other_user:
            match_data = serialize_doc(match)
            match_data['otherUser'] = serialize_doc(other_user)
            result_matches.append(match_data)
    
    return result_matches

# =============== MESSAGE ENDPOINTS ===============

@api_router.post("/messages")
async def send_message(message: Message):
    message_dict = message.dict(exclude={'id'})
    result = await db.messages.insert_one(message_dict)
    message_dict['id'] = str(result.inserted_id)
    return serialize_doc(message_dict)

@api_router.get("/messages/match/{match_id}")
async def get_match_messages(match_id: str):
    messages = await db.messages.find({"matchId": match_id}).sort("createdAt", 1).to_list(500)
    return [serialize_doc(m) for m in messages]

# =============== EVENT ENDPOINTS ===============

@api_router.get("/events")
async def get_events():
    events = await db.events.find().sort("eventDate", 1).to_list(200)
    return [serialize_doc(e) for e in events]

@api_router.post("/events")
async def create_event(event: Event):
    event_dict = event.dict(exclude={'id'})
    result = await db.events.insert_one(event_dict)
    event_dict['id'] = str(result.inserted_id)
    return serialize_doc(event_dict)

@api_router.post("/rsvps")
async def create_rsvp(rsvp: RSVP):
    # Check if already RSVP'd
    existing = await db.rsvps.find_one({
        "userId": rsvp.userId,
        "eventId": rsvp.eventId
    })
    if existing:
        return serialize_doc(existing)
    
    rsvp_dict = rsvp.dict(exclude={'id'})
    result = await db.rsvps.insert_one(rsvp_dict)
    rsvp_dict['id'] = str(result.inserted_id)
    return serialize_doc(rsvp_dict)

@api_router.get("/rsvps/user/{user_id}")
async def get_user_rsvps(user_id: str):
    rsvps = await db.rsvps.find({"userId": user_id}).to_list(200)
    return [serialize_doc(r) for r in rsvps]

# =============== GIFT ENDPOINTS ===============

@api_router.get("/gifts")
async def get_gifts():
    gifts = await db.gifts.find().to_list(100)
    if not gifts:
        # Initialize default gifts
        default_gifts = [
            {"name": "Rose", "emoji": "🌹", "giftType": "cute"},
            {"name": "Heart", "emoji": "❤️", "giftType": "cute"},
            {"name": "Drink", "emoji": "🍹", "giftType": "cute"},
            {"name": "Fire", "emoji": "🔥", "giftType": "spicy"},
            {"name": "Peach", "emoji": "🍑", "giftType": "spicy"},
            {"name": "Eggplant", "emoji": "🍆", "giftType": "spicy"},
            {"name": "Kiss", "emoji": "💋", "giftType": "spicy"},
            {"name": "Wink", "emoji": "😉", "giftType": "cute"},
        ]
        await db.gifts.insert_many(default_gifts)
        gifts = await db.gifts.find().to_list(100)
    
    return [serialize_doc(g) for g in gifts]

@api_router.post("/gifts/send")
async def send_gift(gift_sent: GiftSent):
    gift_dict = gift_sent.dict(exclude={'id'})
    result = await db.gifts_sent.insert_one(gift_dict)
    gift_dict['id'] = str(result.inserted_id)
    return serialize_doc(gift_dict)

# =============== ADMIN ENDPOINTS ===============

@api_router.post("/admin/ai-user")
async def create_ai_user(
    email: str = Body(...),
    displayName: str = Body(...),
    bio: str = Body(default="")
):
    # Create AI user
    ai_user = User(
        email=email,
        password="ai_user_" + email,
        displayName=displayName,
        bio=bio,
        isAI=True,
        currentVibe="just vibing"
    )
    
    ai_user.personalityText = await generate_ai_text(
        f"Write a short sarcastic, funny one-liner about a person named {displayName} for a dating app."
    )
    ai_user.makeItCountText = await generate_ai_text(
        "Write a short sarcastic dating app tagline. One sentence max."
    )
    
    user_dict = ai_user.dict(exclude={'id'})
    result = await db.users.insert_one(user_dict)
    user_dict['id'] = str(result.inserted_id)
    return serialize_doc(user_dict)

@api_router.get("/admin/ai-users")
async def get_ai_users():
    ai_users = await db.users.find({"isAI": True}).to_list(200)
    return [serialize_doc(u) for u in ai_users]

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
