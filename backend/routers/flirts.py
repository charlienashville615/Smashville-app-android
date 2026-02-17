from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime

from database import db
from models import Flirt
from helpers import serialize_doc

router = APIRouter(prefix="/api", tags=["flirts"])


@router.post("/flirts")
async def send_flirt(flirt: Flirt):
    """Send a flirt to another user at the same venue"""
    from_checkin = await db.checkins.find_one({
        "userId": flirt.fromUserId,
        "venueId": flirt.venueId,
        "expiresAt": {"$gt": datetime.utcnow()}
    })
    to_checkin = await db.checkins.find_one({
        "userId": flirt.toUserId,
        "venueId": flirt.venueId,
        "expiresAt": {"$gt": datetime.utcnow()}
    })

    if not from_checkin or not to_checkin:
        raise HTTPException(status_code=400, detail="Both users must be checked in to the same venue")

    flirt_dict = flirt.dict(exclude={'id'})
    result = await db.flirts.insert_one(flirt_dict)
    flirt_dict['id'] = str(result.inserted_id)
    return serialize_doc(flirt_dict)


@router.get("/flirts/user/{user_id}")
async def get_user_flirts(user_id: str):
    """Get flirts received by user"""
    flirts = await db.flirts.find({"toUserId": user_id}).sort("createdAt", -1).to_list(100)

    result_flirts = []
    for flirt in flirts:
        sender = await db.users.find_one({"_id": ObjectId(flirt['fromUserId'])})
        if sender:
            flirt_data = serialize_doc(flirt)
            flirt_data['sender'] = serialize_doc(sender)
            result_flirts.append(flirt_data)

    return result_flirts
