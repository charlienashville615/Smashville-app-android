from fastapi import APIRouter, HTTPException, Body
from bson import ObjectId
from datetime import datetime
import logging

from database import db
from models import SupportTicket
from helpers import serialize_doc

router = APIRouter(prefix="/api", tags=["support"])


@router.post("/support/ticket")
async def create_support_ticket(ticket: SupportTicket):
    """Create a support ticket"""
    ticket_dict = ticket.dict(exclude={'id'})
    result = await db.support_tickets.insert_one(ticket_dict)
    ticket_dict['id'] = str(result.inserted_id)
    logging.info(f"Support ticket created: {ticket.subject} from {ticket.email}")
    return serialize_doc(ticket_dict)


@router.get("/support/tickets")
async def get_support_tickets(admin_id: str):
    """Get all support tickets (admin only)"""
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin access required")

    tickets = await db.support_tickets.find().sort("createdAt", -1).to_list(200)
    return [serialize_doc(t) for t in tickets]


@router.get("/settings")
async def get_settings():
    """Get app settings"""
    settings = await db.app_settings.find_one()
    if not settings:
        default_settings = {
            "supportEmail": "support@smashville.app",
            "updatedAt": datetime.utcnow()
        }
        result = await db.app_settings.insert_one(default_settings)
        settings = await db.app_settings.find_one({"_id": result.inserted_id})
    return serialize_doc(settings)


@router.put("/settings")
async def update_settings(admin_id: str = Body(...), supportEmail: str = Body(...)):
    """Update app settings (admin only)"""
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin access required")

    await db.app_settings.update_one(
        {},
        {"$set": {"supportEmail": supportEmail, "updatedAt": datetime.utcnow()}},
        upsert=True
    )
    return {"message": "Settings updated"}
