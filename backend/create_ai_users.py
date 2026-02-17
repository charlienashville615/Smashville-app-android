import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv
from pathlib import Path
from emergentintegrations.llm.chat import LlmChat, UserMessage
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

async def generate_ai_text(prompt: str) -> str:
    """Generate AI text using Emergent LLM"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message="You are a witty, sarcastic dating app copywriter."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response.strip()
    except Exception as e:
        print(f"AI generation error: {e}")
        return "Too cool for a bio"

# AI User Templates
AI_USER_TEMPLATES = [
    {
        "displayName": "Nashville Nash",
        "bio": "Musician by night, coffee addict by day. If you can't handle my guitar solos, swipe left.",
        "currentVibe": "I came to get down",
    },
    {
        "displayName": "Broadway Betty",
        "bio": "Broadway regular, karaoke queen, and professional line dancer. Let's two-step our way to love.",
        "currentVibe": "looking for drinks",
    },
    {
        "displayName": "Honky Tonk Harry",
        "bio": "I know every word to every country song. Yes, even the new ones. Yes, it's a problem.",
        "currentVibe": "just vibing",
    },
    {
        "displayName": "Music City Mike",
        "bio": "Moved here for the music scene, stayed for the hot chicken. Priorities, right?",
        "currentVibe": "linking",
    },
    {
        "displayName": "Southern Charm Sarah",
        "bio": "Sweet tea in one hand, whiskey in the other. Balance is key.",
        "currentVibe": "here to dance",
    },
    {
        "displayName": "Boots & Whiskey Will",
        "bio": "Cowboy boots enthusiast, whiskey connoisseur, terrible dancer. 2 out of 3 ain't bad.",
        "currentVibe": "I came to get down",
    },
    {
        "displayName": "Guitar Girl Grace",
        "bio": "Singer-songwriter trying to make it in Nashville. Also trying to find someone who'll listen to my demos.",
        "currentVibe": "just vibing",
    },
    {
        "displayName": "Dive Bar Dave",
        "bio": "Fancy bars are overrated. Give me a jukebox and cheap beer any day.",
        "currentVibe": "looking for drinks",
    },
]

async def create_ai_users():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🤖 Creating AI chatbot users...")
    
    # Clear existing AI users
    result = await db.users.delete_many({"isAI": True})
    print(f"Cleared {result.deleted_count} existing AI users")
    
    created_users = []
    
    for i, template in enumerate(AI_USER_TEMPLATES):
        print(f"\n Creating AI user {i+1}/{len(AI_USER_TEMPLATES)}: {template['displayName']}...")
        
        # Generate AI personality texts
        personality_prompt = f"Write a short sarcastic, funny one-liner about a person named {template['displayName']} for a dating app. Be witty and playful."
        personality_text = await generate_ai_text(personality_prompt)
        
        make_it_count_prompt = "Write a short sarcastic dating app tagline. One sentence max. Be funny and cheeky."
        make_it_count_text = await generate_ai_text(make_it_count_prompt)
        
        # Create user
        user_data = {
            "email": f"ai_{i+1}@smashville.app",
            "password": f"ai_user_{i+1}",
            "displayName": template["displayName"],
            "bio": template["bio"],
            "photos": [],
            "coverPhoto": None,
            "currentVibe": template["currentVibe"],
            "personalityText": personality_text,
            "makeItCountText": make_it_count_text,
            "isPremium": i % 3 == 0,  # Every 3rd user is premium
            "premiumExpiresAt": None,
            "isAI": True,
            "createdAt": datetime.utcnow()
        }
        
        result = await db.users.insert_one(user_data)
        user_data['id'] = str(result.inserted_id)
        created_users.append(user_data)
        
        print(f"   ✓ {template['displayName']}")
        print(f"     Personality: {personality_text}")
        print(f"     Make It Count: {make_it_count_text}")
        print(f"     Premium: {'Yes' if user_data['isPremium'] else 'No'}")
    
    print(f"\n🎉 Created {len(created_users)} AI chatbot users!")
    
    client.close()
    return created_users

if __name__ == "__main__":
    asyncio.run(create_ai_users())
