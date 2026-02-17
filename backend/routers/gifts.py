from fastapi import APIRouter

from database import db
from models import GiftSent
from helpers import serialize_doc

router = APIRouter(prefix="/api", tags=["gifts"])


@router.get("/gifts")
async def get_gifts():
    gifts = await db.gifts.find().to_list(100)
    if not gifts:
        default_gifts = [
            {"name": "Rose", "emoji": "\U0001f339", "giftType": "cute"},
            {"name": "Heart", "emoji": "\u2764\ufe0f", "giftType": "cute"},
            {"name": "Drink", "emoji": "\U0001f379", "giftType": "cute"},
            {"name": "Fire", "emoji": "\U0001f525", "giftType": "spicy"},
            {"name": "Peach", "emoji": "\U0001f351", "giftType": "spicy"},
            {"name": "Eggplant", "emoji": "\U0001f346", "giftType": "spicy"},
            {"name": "Kiss", "emoji": "\U0001f48b", "giftType": "spicy"},
            {"name": "Wink", "emoji": "\U0001f609", "giftType": "cute"},
        ]
        await db.gifts.insert_many(default_gifts)
        gifts = await db.gifts.find().to_list(100)

    return [serialize_doc(g) for g in gifts]


@router.post("/gifts/send")
async def send_gift(gift_sent: GiftSent):
    gift_dict = gift_sent.dict(exclude={'id'})
    result = await db.gifts_sent.insert_one(gift_dict)
    gift_dict['id'] = str(result.inserted_id)
    return serialize_doc(gift_dict)
