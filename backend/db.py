import os
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "mentor_os"

_client = None
_db = None

def get_db():
    global _client, _db
    if _db is None:
        try:
            _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            # Check connection
            _client.server_info()
            _db = _client[DB_NAME]
            print(f"Connected to MongoDB at {MONGO_URI} [DB: {DB_NAME}]")
            
            # Create indexes
            _db.users.create_index("email", unique=True)
            _db.chat_sessions.create_index([("user_id", 1), ("updated_at", -1)])
            _db.chat_messages.create_index([("session_id", 1), ("timestamp", 1)])
            _db.quiz_attempts.create_index([("user_id", 1), ("timestamp", -1)])
            _db.study_plans.create_index("user_id", unique=True)
            _db.uploaded_materials.create_index("user_id")
            
        except Exception as e:
            print(f"FAILED to connect to MongoDB: {e}")
            raise e
    return _db

# Helper to get specific collections
def get_collection(name):
    return get_db()[name]
