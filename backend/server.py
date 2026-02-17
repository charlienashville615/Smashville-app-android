from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging

# Import database (initializes connection)
from database import client

# Import all routers
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.venues import router as venues_router
from routers.checkins import router as checkins_router
from routers.flirts import router as flirts_router
from routers.swipes import router as swipes_router
from routers.messages import router as messages_router
from routers.events import router as events_router
from routers.gifts import router as gifts_router
from routers.admin import router as admin_router
from routers.safety import router as safety_router
from routers.support import router as support_router

# Import Stripe routes
from stripe_routes import stripe_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="Smashville API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(venues_router)
app.include_router(checkins_router)
app.include_router(flirts_router)
app.include_router(swipes_router)
app.include_router(messages_router)
app.include_router(events_router)
app.include_router(gifts_router)
app.include_router(admin_router)
app.include_router(safety_router)
app.include_router(support_router)
app.include_router(stripe_router, prefix="/api")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
