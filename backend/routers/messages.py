from fastapi import APIRouter

from database import db
from models import Message
from helpers import serialize_doc

router = APIRouter(prefix="/api", tags=["messages"])


@router.post("/messages")
async def send_message(message: Message):
    message_dict = message.dict(exclude={'id'})
    result = await db.messages.insert_one(message_dict)
    message_dict['id'] = str(result.inserted_id)
    return serialize_doc(message_dict)


@router.get("/messages/match/{match_id}")
async def get_match_messages(match_id: str):
    messages = await db.messages.find({"matchId": match_id}).sort("createdAt", 1).to_list(500)
    return [serialize_doc(m) for m in messages]
