from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_voice: bool = False

class ChatSession(BaseModel):
    session_id: str
    user_id: int
    title: Optional[str] = "New Conversation"
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Bookmark(BaseModel):
    user_id: int
    session_id: str
    message_index: int
    content: str
    note_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
