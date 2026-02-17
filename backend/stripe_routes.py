# Stripe Payment Integration for Smashville Premium Subscriptions

from fastapi import APIRouter, HTTPException, Request, Body
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import os
import logging

# Get Stripe API key from environment
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Fixed premium package
PREMIUM_PACKAGE = {
    "monthly": 14.99
}

stripe_router = APIRouter(prefix="/payments", tags=["payments"])

class PaymentTransaction(BaseModel):
    session_id: str
    user_id: str
    amount: float
    currency: str
    payment_status: str  # "pending", "paid", "failed", "expired"
    package_id: str
    created_at: datetime
    updated_at: datetime

@stripe_router.post("/create-checkout")
async def create_checkout_session(
    user_id: str = Body(...),
    package_id: str = Body(...),
    origin_url: str = Body(...),
    request: Request = None
):
    """Create a Stripe checkout session for premium subscription"""
    
    # Validate package
    if package_id not in PREMIUM_PACKAGE:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    # Get amount from server-side definition (security)
    amount = PREMIUM_PACKAGE[package_id]
    
    try:
        # Initialize Stripe Checkout
        from motor.motor_asyncio import AsyncIOMotorClient
        from bson import ObjectId
        
        mongo_url = os.environ['MONGO_URL']
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ['DB_NAME']]
        
        # Build dynamic success/cancel URLs
        success_url = f"{origin_url}/premium/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/premium"
        
        # Get base URL for webhook
        host_url = origin_url.replace('https', 'https').replace('http', 'https')  # Ensure https
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        # Initialize Stripe
        stripe_checkout = StripeCheckout(
            api_key=STRIPE_API_KEY,
            webhook_url=webhook_url
        )
        
        # Create checkout session request
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "package_id": package_id,
                "source": "smashville_premium"
            }
        )
        
        # Create checkout session
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record (BEFORE redirect)
        transaction = {
            "session_id": session.session_id,
            "user_id": user_id,
            "amount": amount,
            "currency": "usd",
            "payment_status": "pending",
            "package_id": package_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.payment_transactions.insert_one(transaction)
        
        logging.info(f"Created checkout session {session.session_id} for user {user_id}")
        
        client.close()
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logging.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@stripe_router.get("/checkout-status/{session_id}")
async def get_checkout_status(session_id: str):
    """Get the status of a checkout session and update user premium status"""
    
    try:
        # Initialize Stripe
        stripe_checkout = StripeCheckout(
            api_key=STRIPE_API_KEY,
            webhook_url=""  # Not needed for status check
        )
        
        # Get checkout status from Stripe
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction and user if payment successful
        from motor.motor_asyncio import AsyncIOMotorClient
        from bson import ObjectId
        
        mongo_url = os.environ['MONGO_URL']
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ['DB_NAME']]
        
        # Get transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        
        if not transaction:
            logging.error(f"Transaction not found for session {session_id}")
            client.close()
            return {
                "status": status.status,
                "payment_status": status.payment_status
            }
        
        # Only process if payment successful and not already processed
        if status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            # Update transaction status
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Update user premium status
            user_id = status.metadata.get("user_id") or transaction.get("user_id")
            
            if user_id:
                premium_expires_at = datetime.utcnow() + timedelta(days=30)
                
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {
                        "$set": {
                            "isPremium": True,
                            "premiumExpiresAt": premium_expires_at
                        }
                    }
                )
                
                logging.info(f"Updated user {user_id} to premium status")
        
        elif status.status == "expired" and transaction.get("payment_status") == "pending":
            # Mark as expired
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "expired",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        
        client.close()
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency
        }
        
    except Exception as e:
        logging.error(f"Error getting checkout status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@stripe_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    try:
        # Get raw body and signature
        body = await request.body()
        signature = request.headers.get("Stripe-Signature", "")
        
        # Initialize Stripe
        stripe_checkout = StripeCheckout(
            api_key=STRIPE_API_KEY,
            webhook_url=""  # Not used in webhook handling
        )
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Process the webhook event
        if webhook_response.event_type == "checkout.session.completed" and webhook_response.payment_status == "paid":
            # Update transaction and user
            from motor.motor_asyncio import AsyncIOMotorClient
            from bson import ObjectId
            
            mongo_url = os.environ['MONGO_URL']
            client = AsyncIOMotorClient(mongo_url)
            db = client[os.environ['DB_NAME']]
            
            session_id = webhook_response.session_id
            
            # Check if already processed
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            
            if transaction and transaction.get("payment_status") != "paid":
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "payment_status": "paid",
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                # Update user
                user_id = webhook_response.metadata.get("user_id")
                if user_id:
                    premium_expires_at = datetime.utcnow() + timedelta(days=30)
                    
                    await db.users.update_one(
                        {"_id": ObjectId(user_id)},
                        {
                            "$set": {
                                "isPremium": True,
                                "premiumExpiresAt": premium_expires_at
                            }
                        }
                    )
                    
                    logging.info(f"Webhook: Updated user {user_id} to premium via webhook")
            
            client.close()
        
        return {"status": "success"}
        
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
