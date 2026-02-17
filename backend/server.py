from fastapi import FastAPI, APIRouter, HTTPException, Body, Request
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
from emergentintegrations.llm.chat import LlmChat, UserMessage
import uuid

# Import Stripe routes
from stripe_routes import stripe_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

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
    emergencyPin: Optional[str] = None  # 4-digit PIN for emergency alert deactivation
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class EmergencyContact(BaseModel):
    id: Optional[str] = None
    userId: str
    name: str
    phoneNumber: str
    relationship: Optional[str] = ""
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class EmergencyAlert(BaseModel):
    id: Optional[str] = None
    userId: str
    isActive: bool = True
    activatedAt: datetime = Field(default_factory=datetime.utcnow)
    deactivatedAt: Optional[datetime] = None
    lastLocationUpdate: datetime = Field(default_factory=datetime.utcnow)
    latitude: float
    longitude: float
    notifiedContacts: List[str] = []  # Contact IDs that have been notified
    locationHistory: List[dict] = []  # Track location updates

class Venue(BaseModel):
    id: Optional[str] = None
    name: str
    type: str  # bar, club, arena, theater, etc.
    address: str
    city: str = "Nashville"
    state: str = "TN"
    description: Optional[str] = ""
    closingTime: Optional[str] = "02:00"  # 24hr format
    latitude: Optional[float] = None  # GPS coordinates for verification
    longitude: Optional[float] = None
    gpsRadius: Optional[float] = 100.0  # Meters radius for check-in verification
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class CheckIn(BaseModel):
    id: Optional[str] = None
    userId: str
    venueId: str
    latitude: Optional[float] = None  # User's GPS coordinates
    longitude: Optional[float] = None
    verified: bool = False  # GPS verification status
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

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in meters using Haversine formula"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371000  # Earth's radius in meters
    
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    
    a = sin(delta_lat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c

async def verify_gps_location(user_lat: float, user_lon: float, venue_id: str) -> tuple[bool, float]:
    """Verify if user's GPS coordinates are within venue's radius"""
    venue = await db.venues.find_one({"_id": ObjectId(venue_id)})
    
    if not venue or not venue.get('latitude') or not venue.get('longitude'):
        # If venue has no GPS coordinates, allow check-in (backward compatibility)
        return True, 0.0
    
    distance = calculate_distance(
        user_lat, user_lon,
        venue['latitude'], venue['longitude']
    )
    
    radius = venue.get('gpsRadius', 100.0)
    return distance <= radius, distance

async def generate_ai_text(prompt: str) -> str:
    """Generate AI text using Emergent LLM"""
    if not EMERGENT_LLM_KEY:
        return "Your vibe is immaculate"
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message="You are a witty, sarcastic dating app copywriter."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response.strip()
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
    
    # Verify GPS if coordinates provided
    verified = False
    if checkin.latitude and checkin.longitude:
        is_within_range, distance = await verify_gps_location(
            checkin.latitude, checkin.longitude, checkin.venueId
        )
        verified = is_within_range
        
        if not is_within_range:
            # Still allow check-in but mark as unverified
            logging.warning(f"User {checkin.userId} checked in {distance}m away from venue")
    
    # Create new check-in
    checkin_dict = checkin.dict(exclude={'id'})
    checkin_dict['verified'] = verified
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

# =============== EMERGENCY CONTACTS ENDPOINTS ===============

@api_router.post("/emergency-contacts")
async def create_emergency_contact(contact: EmergencyContact):
    contact_dict = contact.dict(exclude={'id'})
    result = await db.emergency_contacts.insert_one(contact_dict)
    contact_dict['id'] = str(result.inserted_id)
    return serialize_doc(contact_dict)

@api_router.get("/emergency-contacts/user/{user_id}")
async def get_user_emergency_contacts(user_id: str):
    contacts = await db.emergency_contacts.find({"userId": user_id}).to_list(100)
    return [serialize_doc(c) for c in contacts]

@api_router.put("/emergency-contacts/{contact_id}")
async def update_emergency_contact(contact_id: str, updates: dict):
    result = await db.emergency_contacts.update_one(
        {"_id": ObjectId(contact_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact = await db.emergency_contacts.find_one({"_id": ObjectId(contact_id)})
    return serialize_doc(contact)

@api_router.delete("/emergency-contacts/{contact_id}")
async def delete_emergency_contact(contact_id: str):
    result = await db.emergency_contacts.delete_one({"_id": ObjectId(contact_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# =============== EMERGENCY ALERT ENDPOINTS ===============

@api_router.post("/emergency-alert/activate")
async def activate_emergency_alert(
    userId: str = Body(...),
    latitude: float = Body(...),
    longitude: float = Body(...)
):
    """Activate emergency alert and notify contacts"""
    
    # Get user's emergency contacts
    contacts = await db.emergency_contacts.find({"userId": userId}).to_list(100)
    
    if not contacts:
        raise HTTPException(status_code=400, detail="No emergency contacts configured")
    
    # Create emergency alert
    alert = EmergencyAlert(
        userId=userId,
        latitude=latitude,
        longitude=longitude,
        notifiedContacts=[str(c['_id']) for c in contacts],
        locationHistory=[{
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.utcnow().isoformat()
        }]
    )
    
    alert_dict = alert.dict(exclude={'id'})
    result = await db.emergency_alerts.insert_one(alert_dict)
    alert_dict['id'] = str(result.inserted_id)
    
    # Get user details
    user = await db.users.find_one({"_id": ObjectId(userId)})
    
    # Log notification (in production, this would send actual SMS/notifications)
    for contact in contacts:
        logging.warning(f"🚨 EMERGENCY ALERT: {user['displayName']} has activated emergency alert. "
                       f"Contact {contact['name']} ({contact['phoneNumber']}) should be notified. "
                       f"Location: {latitude}, {longitude}")
    
    return serialize_doc(alert_dict)

@api_router.post("/emergency-alert/update-location")
async def update_emergency_location(
    alertId: str = Body(...),
    latitude: float = Body(...),
    longitude: float = Body(...)
):
    """Update location for active emergency alert"""
    
    alert = await db.emergency_alerts.find_one({"_id": ObjectId(alertId), "isActive": True})
    
    if not alert:
        raise HTTPException(status_code=404, detail="Active alert not found")
    
    # Add to location history
    location_update = {
        "latitude": latitude,
        "longitude": longitude,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    result = await db.emergency_alerts.update_one(
        {"_id": ObjectId(alertId)},
        {
            "$set": {
                "latitude": latitude,
                "longitude": longitude,
                "lastLocationUpdate": datetime.utcnow()
            },
            "$push": {"locationHistory": location_update}
        }
    )
    
    # Get user and contacts for logging
    user = await db.users.find_one({"_id": ObjectId(alert['userId'])})
    contacts = await db.emergency_contacts.find({"userId": alert['userId']}).to_list(100)
    
    # Log location update (in production, send notifications)
    for contact in contacts:
        logging.warning(f"🚨 LOCATION UPDATE: {user['displayName']} - "
                       f"Contact {contact['name']} updated. Location: {latitude}, {longitude}")
    
    return {"message": "Location updated", "timestamp": datetime.utcnow().isoformat()}

@api_router.post("/emergency-alert/deactivate")
async def deactivate_emergency_alert(
    alertId: str = Body(...),
    userId: str = Body(...),
    pin: str = Body(...)
):
    """Deactivate emergency alert with PIN verification"""
    
    # Verify PIN
    user = await db.users.find_one({"_id": ObjectId(userId)})
    
    if not user or not user.get('emergencyPin'):
        raise HTTPException(status_code=400, detail="Emergency PIN not set")
    
    if user['emergencyPin'] != pin:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    # Deactivate alert
    result = await db.emergency_alerts.update_one(
        {"_id": ObjectId(alertId), "userId": userId},
        {
            "$set": {
                "isActive": False,
                "deactivatedAt": datetime.utcnow()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    logging.info(f"Emergency alert {alertId} deactivated by user {userId}")
    
    return {"message": "Emergency alert deactivated"}

@api_router.get("/emergency-alert/active/{user_id}")
async def get_active_alert(user_id: str):
    """Get active emergency alert for user"""
    alert = await db.emergency_alerts.find_one({
        "userId": user_id,
        "isActive": True
    })
    return serialize_doc(alert) if alert else None

@api_router.post("/users/{user_id}/emergency-pin")
async def set_emergency_pin(user_id: str, pin: str = Body(...)):
    """Set or update emergency PIN"""
    
    # Validate PIN (4 digits)
    if not pin or len(pin) != 4 or not pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be 4 digits")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"emergencyPin": pin}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Emergency PIN set successfully"}

# =============== STATUS UPDATES ENDPOINTS ===============

@api_router.post("/users/{user_id}/status")
async def update_status(user_id: str, status: str = Body(...)):
    """Update user's status message"""
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"statusMessage": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Status updated"}

@api_router.get("/status/ai-suggestions")
async def get_ai_status_suggestions():
    """Generate AI status message suggestions"""
    suggestions = []
    for i in range(5):
        text = await generate_ai_text(
            "Write a funny, short status message for a dating app user in Nashville. One sentence max. Be witty and music/Nashville themed."
        )
        suggestions.append(text)
    return {"suggestions": suggestions}

# =============== ADMIN ENDPOINTS ===============

@api_router.post("/admin/make-admin")
async def make_user_admin(
    admin_id: str = Body(...),
    target_user_id: str = Body(...)
):
    """Make another user an admin (admin only)"""
    # Verify requesting user is admin
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.update_one(
        {"_id": ObjectId(target_user_id)},
        {"$set": {"isAdmin": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User is now an admin"}

@api_router.post("/admin/ban-user")
async def ban_user(
    admin_id: str = Body(...),
    target_user_id: str = Body(...),
    ban: bool = Body(default=True)
):
    """Ban or unban a user (admin only)"""
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.update_one(
        {"_id": ObjectId(target_user_id)},
        {"$set": {"isBanned": ban}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {'banned' if ban else 'unbanned'}"}

@api_router.post("/admin/block-user")
async def block_user(
    admin_id: str = Body(...),
    target_user_id: str = Body(...),
    block: bool = Body(default=True)
):
    """Block or unblock a user (admin only)"""
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.update_one(
        {"_id": ObjectId(target_user_id)},
        {"$set": {"isBlocked": block}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {'blocked' if block else 'unblocked'}"}

@api_router.post("/admin/timeout-user")
async def timeout_user(
    admin_id: str = Body(...),
    target_user_id: str = Body(...),
    hours: int = Body(default=24)
):
    """Put user in timeout (admin only)"""
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    timeout_until = datetime.utcnow() + timedelta(hours=hours)
    
    result = await db.users.update_one(
        {"_id": ObjectId(target_user_id)},
        {"$set": {"timeoutUntil": timeout_until}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User in timeout for {hours} hours", "timeout_until": timeout_until.isoformat()}

@api_router.get("/admin/all-users")
async def get_all_users(admin_id: str):
    """Get all users for moderation (admin only)"""
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find().to_list(1000)
    return [serialize_doc(u) for u in users]

# =============== SUPPORT ENDPOINTS ===============

@api_router.post("/support/ticket")
async def create_support_ticket(ticket: SupportTicket):
    """Create a support ticket"""
    ticket_dict = ticket.dict(exclude={'id'})
    result = await db.support_tickets.insert_one(ticket_dict)
    ticket_dict['id'] = str(result.inserted_id)
    
    # In production, send email here
    logging.info(f"Support ticket created: {ticket.subject} from {ticket.email}")
    
    return serialize_doc(ticket_dict)

@api_router.get("/support/tickets")
async def get_support_tickets(admin_id: str):
    """Get all support tickets (admin only)"""
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tickets = await db.support_tickets.find().sort("createdAt", -1).to_list(200)
    return [serialize_doc(t) for t in tickets]

@api_router.get("/settings")
async def get_settings():
    """Get app settings"""
    settings = await db.app_settings.find_one()
    if not settings:
        # Create default settings
        default_settings = {
            "supportEmail": "support@smashville.app",
            "updatedAt": datetime.utcnow()
        }
        result = await db.app_settings.insert_one(default_settings)
        settings = await db.app_settings.find_one({"_id": result.inserted_id})
    return serialize_doc(settings)

@api_router.put("/settings")
async def update_settings(admin_id: str = Body(...), supportEmail: str = Body(...)):
    """Update app settings (admin only)"""
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.app_settings.update_one(
        {},
        {"$set": {"supportEmail": supportEmail, "updatedAt": datetime.utcnow()}},
        upsert=True
    )
    
    return {"message": "Settings updated"}

# Include routers
app.include_router(api_router)
app.include_router(stripe_router, prefix="/api")  # Stripe payment routes

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
