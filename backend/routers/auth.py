from fastapi import APIRouter, HTTPException, Body
from bson import ObjectId
from datetime import datetime

from database import db
from models import User
from helpers import serialize_doc, generate_ai_text

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/auth/signup")
async def signup(user: User):
    if not user.agreedToTerms:
        raise HTTPException(status_code=400, detail="You must agree to the Terms of Service")

    existing = await db.users.find_one({
        "$or": [
            {"email": user.email},
            {"username": user.username}
        ]
    })
    if existing:
        if existing.get('email') == user.email:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            raise HTTPException(status_code=400, detail="Username already taken")

    user.termsAgreedAt = datetime.utcnow()

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


@router.post("/auth/login")
async def login(email: str = Body(...), password: str = Body(...)):
    user = await db.users.find_one({"email": email, "password": password})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return serialize_doc(user)
