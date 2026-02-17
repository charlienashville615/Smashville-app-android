from bson import ObjectId
from math import radians, sin, cos, sqrt, atan2
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import uuid
import logging

from database import db

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in meters using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


async def verify_gps_location(user_lat: float, user_lon: float, venue_id: str) -> tuple:
    """Verify if user's GPS coordinates are within venue's radius"""
    venue = await db.venues.find_one({"_id": ObjectId(venue_id)})
    if not venue or not venue.get('latitude') or not venue.get('longitude'):
        return True, 0.0
    distance = calculate_distance(user_lat, user_lon, venue['latitude'], venue['longitude'])
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
