from fastapi import APIRouter, HTTPException, Body
from bson import ObjectId

from database import db
from helpers import serialize_doc, generate_ai_text

router = APIRouter(prefix="/api", tags=["users"])


@router.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)


@router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict):
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_doc(user)


@router.post("/users/{user_id}/regenerate-ai")
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


@router.post("/users/{user_id}/status")
async def update_status(user_id: str, status: str = Body(..., embed=True)):
    """Update user's status message"""
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"statusMessage": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Status updated"}


@router.get("/status/ai-suggestions")
async def get_ai_status_suggestions():
    """Generate AI status message suggestions"""
    suggestions = []
    for i in range(5):
        text = await generate_ai_text(
            "Write a funny, short status message for a dating app user in Nashville. One sentence max. Be witty and music/Nashville themed."
        )
        suggestions.append(text)
    return {"suggestions": suggestions}


@router.post("/users/{user_id}/emergency-pin")
async def set_emergency_pin(user_id: str, pin: str = Body(..., embed=True)):
    """Set or update emergency PIN"""
    if not pin or len(pin) != 4 or not pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be 4 digits")

    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"emergencyPin": pin}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Emergency PIN set successfully"}
