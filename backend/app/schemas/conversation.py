from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MessageBase(BaseModel):
    conversation_id: int
    content: Optional[str] = None
    sender_type: Optional[str] = None

class MessageCreate(MessageBase):
    pass

class MessageOut(MessageBase):
    message_id: int
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    user_id: int

class ConversationCreate(ConversationBase):
    pass

class ConversationOut(ConversationBase):
    conversation_id: int
    started_at: Optional[datetime] = None
    messages: Optional[List[MessageOut]] = None

    class Config:
        from_attributes = True
