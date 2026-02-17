from fastapi import APIRouter, HTTPException, Body
from bson import ObjectId
from datetime import datetime, timedelta

from database import db
from models import User
from helpers import serialize_doc, generate_ai_text

router = APIRouter(prefix="/api", tags=["admin"])


@router.post("/admin/ai-user")
async def create_ai_user(
    email: str = Body(...),
    displayName: str = Body(...),
    bio: str = Body(default="")
):
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


@router.get("/admin/ai-users")
async def get_ai_users():
    ai_users = await db.users.find({"isAI": True}).to_list(200)
    return [serialize_doc(u) for u in ai_users]


@router.post("/admin/make-admin")
async def make_user_admin(
    admin_id: str = Body(...),
    target_user_id: str = Body(...)
):
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


@router.post("/admin/ban-user")
async def ban_user(
    admin_id: str = Body(...),
    target_user_id: str = Body(...),
    ban: bool = Body(default=True)
):
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


@router.post("/admin/block-user")
async def block_user(
    admin_id: str = Body(...),
    target_user_id: str = Body(...),
    block: bool = Body(default=True)
):
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


@router.post("/admin/timeout-user")
async def timeout_user(
    admin_id: str = Body(...),
    target_user_id: str = Body(...),
    hours: int = Body(default=24)
):
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


@router.get("/admin/all-users")
async def get_all_users(admin_id: str):
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin access required")

    users = await db.users.find().to_list(1000)
    return [serialize_doc(u) for u in users]
