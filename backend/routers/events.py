from fastapi import APIRouter

from database import db
from models import Event, RSVP
from helpers import serialize_doc

router = APIRouter(prefix="/api", tags=["events"])


@router.get("/events")
async def get_events():
    events = await db.events.find().sort("eventDate", 1).to_list(200)
    return [serialize_doc(e) for e in events]


@router.post("/events")
async def create_event(event: Event):
    event_dict = event.dict(exclude={'id'})
    result = await db.events.insert_one(event_dict)
    event_dict['id'] = str(result.inserted_id)
    return serialize_doc(event_dict)


@router.post("/rsvps")
async def create_rsvp(rsvp: RSVP):
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


@router.get("/rsvps/user/{user_id}")
async def get_user_rsvps(user_id: str):
    rsvps = await db.rsvps.find({"userId": user_id}).to_list(200)
    return [serialize_doc(r) for r in rsvps]
