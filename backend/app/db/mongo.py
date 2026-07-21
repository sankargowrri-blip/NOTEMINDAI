from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

_client: AsyncIOMotorClient | None = None


def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_url)
    return _client


def get_mongo_db():
    return get_mongo_client()[settings.mongo_db]


# Collections
def notes_collection():
    return get_mongo_db()["notes_content"]


def versions_collection():
    return get_mongo_db()["note_versions"]


def chat_history_collection():
    return get_mongo_db()["chat_history"]


def quiz_responses_collection():
    return get_mongo_db()["quiz_responses"]
