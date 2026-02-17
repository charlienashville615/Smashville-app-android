from fastapi import APIRouter, HTTPException, Body
from bson import ObjectId
from datetime import datetime
import logging

from database import db
from models import EmergencyContact, EmergencyAlert
from helpers import serialize_doc

router = APIRouter(prefix="/api", tags=["safety"])


# =============== EMERGENCY CONTACTS ===============

@router.post("/emergency-contacts")
async def create_emergency_contact(contact: EmergencyContact):
    contact_dict = contact.dict(exclude={'id'})
    result = await db.emergency_contacts.insert_one(contact_dict)
    contact_dict['id'] = str(result.inserted_id)
    return serialize_doc(contact_dict)


@router.get("/emergency-contacts/user/{user_id}")
async def get_user_emergency_contacts(user_id: str):
    contacts = await db.emergency_contacts.find({"userId": user_id}).to_list(100)
    return [serialize_doc(c) for c in contacts]


@router.put("/emergency-contacts/{contact_id}")
async def update_emergency_contact(contact_id: str, updates: dict):
    result = await db.emergency_contacts.update_one(
        {"_id": ObjectId(contact_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact = await db.emergency_contacts.find_one({"_id": ObjectId(contact_id)})
    return serialize_doc(contact)


@router.delete("/emergency-contacts/{contact_id}")
async def delete_emergency_contact(contact_id: str):
    result = await db.emergency_contacts.delete_one({"_id": ObjectId(contact_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}


# =============== EMERGENCY ALERTS ===============

@router.post("/emergency-alert/activate")
async def activate_emergency_alert(
    userId: str = Body(...),
    latitude: float = Body(...),
    longitude: float = Body(...)
):
    """Activate emergency alert and notify contacts"""
    contacts = await db.emergency_contacts.find({"userId": userId}).to_list(100)
    if not contacts:
        raise HTTPException(status_code=400, detail="No emergency contacts configured")

    alert = EmergencyAlert(
        userId=userId,
        latitude=latitude,
        longitude=longitude,
        notifiedContacts=[str(c['_id']) for c in contacts],
        locationHistory=[{
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.utcnow().isoformat()
        }]
    )

    alert_dict = alert.dict(exclude={'id'})
    result = await db.emergency_alerts.insert_one(alert_dict)
    alert_dict['id'] = str(result.inserted_id)

    user = await db.users.find_one({"_id": ObjectId(userId)})
    for contact in contacts:
        logging.warning(
            f"EMERGENCY ALERT: {user['displayName']} has activated emergency alert. "
            f"Contact {contact['name']} ({contact['phoneNumber']}) should be notified. "
            f"Location: {latitude}, {longitude}"
        )

    return serialize_doc(alert_dict)


@router.post("/emergency-alert/update-location")
async def update_emergency_location(
    alertId: str = Body(...),
    latitude: float = Body(...),
    longitude: float = Body(...)
):
    """Update location for active emergency alert"""
    alert = await db.emergency_alerts.find_one({"_id": ObjectId(alertId), "isActive": True})
    if not alert:
        raise HTTPException(status_code=404, detail="Active alert not found")

    location_update = {
        "latitude": latitude,
        "longitude": longitude,
        "timestamp": datetime.utcnow().isoformat()
    }

    await db.emergency_alerts.update_one(
        {"_id": ObjectId(alertId)},
        {
            "$set": {
                "latitude": latitude,
                "longitude": longitude,
                "lastLocationUpdate": datetime.utcnow()
            },
            "$push": {"locationHistory": location_update}
        }
    )

    user = await db.users.find_one({"_id": ObjectId(alert['userId'])})
    contacts = await db.emergency_contacts.find({"userId": alert['userId']}).to_list(100)
    for contact in contacts:
        logging.warning(
            f"LOCATION UPDATE: {user['displayName']} - "
            f"Contact {contact['name']} updated. Location: {latitude}, {longitude}"
        )

    return {"message": "Location updated", "timestamp": datetime.utcnow().isoformat()}


@router.post("/emergency-alert/deactivate")
async def deactivate_emergency_alert(
    alertId: str = Body(...),
    userId: str = Body(...),
    pin: str = Body(...)
):
    """Deactivate emergency alert with PIN verification"""
    user = await db.users.find_one({"_id": ObjectId(userId)})
    if not user or not user.get('emergencyPin'):
        raise HTTPException(status_code=400, detail="Emergency PIN not set")
    if user['emergencyPin'] != pin:
        raise HTTPException(status_code=401, detail="Invalid PIN")

    result = await db.emergency_alerts.update_one(
        {"_id": ObjectId(alertId), "userId": userId},
        {"$set": {"isActive": False, "deactivatedAt": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")

    logging.info(f"Emergency alert {alertId} deactivated by user {userId}")
    return {"message": "Emergency alert deactivated"}


@router.get("/emergency-alert/active/{user_id}")
async def get_active_alert(user_id: str):
    """Get active emergency alert for user"""
    alert = await db.emergency_alerts.find_one({"userId": user_id, "isActive": True})
    return serialize_doc(alert) if alert else None
