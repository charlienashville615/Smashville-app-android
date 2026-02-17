from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime, timedelta

from database import db
from models import Swipe, Match
from helpers import serialize_doc

router = APIRouter(prefix="/api", tags=["swipes"])


@router.post("/swipes")
async def create_swipe(swipe: Swipe):
    existing = await db.swipes.find_one({
        "userId": swipe.userId,
        "targetUserId": swipe.targetUserId
    })
    if existing:
        return serialize_doc(existing)

    swipe_dict = swipe.dict(exclude={'id'})
    result = await db.swipes.insert_one(swipe_dict)
    swipe_dict['id'] = str(result.inserted_id)

    if swipe.direction == "right":
        reverse_swipe = await db.swipes.find_one({
            "userId": swipe.targetUserId,
            "targetUserId": swipe.userId,
            "direction": "right"
        })
        if reverse_swipe:
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


@router.get("/matches/user/{user_id}")
async def get_user_matches(user_id: str):
    matches = await db.matches.find({
        "$or": [{"user1Id": user_id}, {"user2Id": user_id}],
        "isActive": True
    }).to_list(200)

    result_matches = []
    for match in matches:
        # Skip expired matches
        if match.get('expiresAt') and match['expiresAt'] < datetime.utcnow():
            continue
        other_user_id = match['user2Id'] if match['user1Id'] == user_id else match['user1Id']
        other_user = await db.users.find_one({"_id": ObjectId(other_user_id)})
        if other_user:
            match_data = serialize_doc(match)
            match_data['otherUser'] = serialize_doc(other_user)
            result_matches.append(match_data)

    return result_matches
