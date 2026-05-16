from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.conversation import Conversation, Message
from app.schemas.conversation import ConversationOut, MessageOut, MessageCreate, ConversationCreate

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


def _serialize_message(m: Message) -> MessageOut:
    return MessageOut(
        message_id=m.message_id,
        conversation_id=m.conversation_id,
        content=m.content,
        sender_type=m.sender_type,
        sent_at=m.sent_at,
    )


def _serialize_conversation(c: Conversation, messages: List[Message]) -> ConversationOut:
    return ConversationOut(
        conversation_id=c.conversation_id,
        user_id=c.user_id,
        title=c.title,
        started_at=c.started_at,
        messages=[_serialize_message(m) for m in messages],
    )


@router.get("/")
def list_conversations(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.user_id)
        .order_by(Conversation.conversation_id.desc())
        .all()
    )

    result = []
    for conv in conversations:
        messages = (
            db.query(Message)
            .filter(Message.conversation_id == conv.conversation_id)
            .order_by(Message.sent_at.asc(), Message.message_id.asc())
            .all()
        )
        result.append(_serialize_conversation(conv, messages))

    return result


@router.post("/", response_model=ConversationOut)
def create_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conv = Conversation(
        user_id=current_user.user_id,
        title=payload.title or "Chat with Moda",
        started_at=datetime.utcnow(),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return _serialize_conversation(conv, [])


@router.put("/{conversation_id}", response_model=ConversationOut)
def update_conversation(
    conversation_id: int,
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conv = (
        db.query(Conversation)
        .filter(Conversation.conversation_id == conversation_id)
        .first()
    )
    if not conv or conv.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.title = (payload.title or "Chat with Moda").strip() or "Chat with Moda"
    db.commit()
    db.refresh(conv)
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.sent_at.asc(), Message.message_id.asc())
        .all()
    )
    return _serialize_conversation(conv, messages)


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conv = (
        db.query(Conversation)
        .filter(Conversation.conversation_id == conversation_id)
        .first()
    )
    if not conv or conv.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted"}


@router.post("/{conversation_id}/messages", response_model=MessageOut)
def create_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conv = (
        db.query(Conversation)
        .filter(Conversation.conversation_id == conversation_id)
        .first()
    )
    if not conv or conv.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    message = Message(
        conversation_id=conversation_id,
        content=payload.content,
        sender_type=payload.sender_type,
        sent_at=datetime.utcnow(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _serialize_message(message)
