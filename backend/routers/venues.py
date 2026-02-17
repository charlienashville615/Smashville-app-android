from fastapi import APIRouter, HTTPException
from bson import ObjectId

from database import db
from models import Venue
from helpers import serialize_doc

router = APIRouter(prefix="/api", tags=["venues"])


@router.get("/venues")
async def get_venues(city: str = "Nashville"):
    venues = await db.venues.find({"city": city}).to_list(200)
    return [serialize_doc(v) for v in venues]


@router.post("/venues")
async def create_venue(venue: Venue):
    venue_dict = venue.dict(exclude={'id'})
    result = await db.venues.insert_one(venue_dict)
    venue_dict['id'] = str(result.inserted_id)
    return serialize_doc(venue_dict)


@router.get("/venues/{venue_id}")
async def get_venue(venue_id: str):
    venue = await db.venues.find_one({"_id": ObjectId(venue_id)})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return serialize_doc(venue)
