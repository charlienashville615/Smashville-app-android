from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime

from database import db
from models import CheckIn
from helpers import serialize_doc, verify_gps_location

router = APIRouter(prefix="/api", tags=["checkins"])


@router.post("/checkins")
async def check_in(checkin: CheckIn):
    # MANDATORY: Verify GPS if coordinates provided
    if not checkin.latitude or not checkin.longitude:
        raise HTTPException(status_code=400, detail="GPS location required for check-in")

    is_within_range, distance = await verify_gps_location(
        checkin.latitude, checkin.longitude, checkin.venueId
    )
    if not is_within_range:
        raise HTTPException(
            status_code=403,
            detail=f"You must be at the venue to check in. You are {int(distance)}m away."
        )

    await db.checkins.delete_many({"userId": checkin.userId})

    checkin_dict = checkin.dict(exclude={'id'})
    checkin_dict['verified'] = True
    result = await db.checkins.insert_one(checkin_dict)
    checkin_dict['id'] = str(result.inserted_id)
    return serialize_doc(checkin_dict)


@router.post("/checkins/{user_id}/checkout")
async def checkout(user_id: str):
    """Manual checkout from venue"""
    result = await db.checkins.delete_many({"userId": user_id})
    return {"message": "Checked out successfully", "deleted": result.deleted_count}


@router.get("/checkins/user/{user_id}")
async def get_user_checkin(user_id: str):
    checkin = await db.checkins.find_one({
        "userId": user_id,
        "expiresAt": {"$gt": datetime.utcnow()}
    })
    return serialize_doc(checkin) if checkin else None


@router.get("/checkins/venue/{venue_id}")
async def get_venue_checkins(venue_id: str, user_id: str = None):
    checkins = await db.checkins.find({
        "venueId": venue_id,
        "expiresAt": {"$gt": datetime.utcnow()}
    }).to_list(500)

    user_ids = [ObjectId(c['userId']) for c in checkins]
    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(500)

    # Include AI users in the pool (they roam all venues)
    ai_users = await db.users.find({"isAI": True, "isBanned": {"$ne": True}}).to_list(200)

    # If a requesting user_id is provided, exclude users already swiped on
    swiped_ids = set()
    if user_id:
        existing_swipes = await db.swipes.find({"userId": user_id}).to_list(1000)
        swiped_ids = {s['targetUserId'] for s in existing_swipes}

    # Combine real checked-in users + AI users, deduplicate, exclude already swiped
    seen_ids = set()
    combined = []
    for u in users + ai_users:
        uid = str(u.get('_id', u.get('id', '')))
        if uid not in seen_ids and uid not in swiped_ids:
            seen_ids.add(uid)
            combined.append(u)

    return [serialize_doc(u) for u in combined]


@router.delete("/checkins/{checkin_id}")
async def delete_checkin(checkin_id: str):
    result = await db.checkins.delete_one({"_id": ObjectId(checkin_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Check-in not found")
    return {"message": "Checked out successfully"}
