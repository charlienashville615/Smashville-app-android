from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta


class User(BaseModel):
    id: Optional[str] = None
    email: str
    password: str
    username: str = ""
    displayName: str
    age: Optional[int] = None
    gender: Optional[str] = None
    sexualPreference: Optional[str] = None
    customPreference: Optional[str] = None
    vibeCheck: Optional[str] = None
    bio: Optional[str] = ""
    photos: List[str] = []
    coverPhoto: Optional[str] = None
    currentVibe: Optional[str] = "just vibing"
    statusMessage: Optional[str] = ""
    personalityText: Optional[str] = ""
    makeItCountText: Optional[str] = ""
    isPremium: bool = False
    premiumExpiresAt: Optional[datetime] = None
    isAdmin: bool = False
    isAI: bool = False
    isBanned: bool = False
    isBlocked: bool = False
    timeoutUntil: Optional[datetime] = None
    emergencyPin: Optional[str] = None
    agreedToTerms: bool = False
    termsAgreedAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class Venue(BaseModel):
    id: Optional[str] = None
    name: str
    type: str
    address: str
    city: str = "Nashville"
    state: str = "TN"
    description: Optional[str] = ""
    closingTime: Optional[str] = "02:00"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gpsRadius: Optional[float] = 100.0
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class CheckIn(BaseModel):
    id: Optional[str] = None
    userId: str
    venueId: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    verified: bool = False
    checkedInAt: datetime = Field(default_factory=datetime.utcnow)
    expiresAt: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=6))


class Swipe(BaseModel):
    id: Optional[str] = None
    userId: str
    targetUserId: str
    venueId: str
    direction: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class Match(BaseModel):
    id: Optional[str] = None
    user1Id: str
    user2Id: str
    venueId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    expiresAt: Optional[datetime] = None
    isActive: bool = True


class Message(BaseModel):
    id: Optional[str] = None
    matchId: str
    senderId: str
    content: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class Event(BaseModel):
    id: Optional[str] = None
    venueId: str
    name: str
    description: str
    eventDate: datetime
    eventType: str
    imageUrl: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class RSVP(BaseModel):
    id: Optional[str] = None
    userId: str
    eventId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class Gift(BaseModel):
    id: Optional[str] = None
    name: str
    emoji: str
    giftType: str


class GiftSent(BaseModel):
    id: Optional[str] = None
    fromUserId: str
    toUserId: str
    giftId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class Flirt(BaseModel):
    id: Optional[str] = None
    fromUserId: str
    toUserId: str
    venueId: str
    message: Optional[str] = "sent you a flirt"
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class EmergencyContact(BaseModel):
    id: Optional[str] = None
    userId: str
    name: str
    phoneNumber: str
    relationship: Optional[str] = ""
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class EmergencyAlert(BaseModel):
    id: Optional[str] = None
    userId: str
    isActive: bool = True
    activatedAt: datetime = Field(default_factory=datetime.utcnow)
    deactivatedAt: Optional[datetime] = None
    lastLocationUpdate: datetime = Field(default_factory=datetime.utcnow)
    latitude: float
    longitude: float
    notifiedContacts: List[str] = []
    locationHistory: List[dict] = []


class SupportTicket(BaseModel):
    id: Optional[str] = None
    userId: str
    subject: str
    message: str
    email: str
    status: str = "open"
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class AppSettings(BaseModel):
    id: Optional[str] = None
    supportEmail: Optional[str] = None
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
