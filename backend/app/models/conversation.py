from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from app.database import Base

class Conversation(Base):
    __tablename__ = "conversation"

    conversation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(200), nullable=True)
    started_at = Column(DateTime, nullable=True)


class Message(Base):
    __tablename__ = "messages"

    message_id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversation.conversation_id"), nullable=False)
    content = Column(Text, nullable=True)
    sender_type = Column(String(20), nullable=True)
    sent_at = Column(DateTime, nullable=True)
