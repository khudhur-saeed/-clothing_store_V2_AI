import os
from base64 import b64encode
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session
import google.generativeai as genai

from app.core.config import settings
from app.dependencies import get_db
from app.models.product import Product
from app.core.search import search_products

# Configure Gemini with the API key from environment variables
genai.configure(api_key=settings.VITE_GEMINI_API_KEY)

router = APIRouter(prefix="/api/ai", tags=["AI"])


class ChatMessage(BaseModel):
    sender_type: str
    content: str


class ChatRequest(BaseModel):
    history: List[ChatMessage]
    user_message: str


def _get_products_for_chat(db: Session, user_message: str, limit: int = 5) -> List[Product]:
    """Retrieve relevant active products for chatbot answers.

    Primary path: Elasticsearch via search_products().
    Fallback path: PostgreSQL ILIKE if Elasticsearch is unavailable.
    """
    matched_ids = search_products(user_message)

    if matched_ids is None:
        # Elasticsearch unavailable -> fallback to DB text search
        return (
            db.query(Product)
            .filter(Product.status == "active")
            .filter(
                or_(
                    Product.name.ilike(f"%{user_message}%"),
                    Product.description.ilike(f"%{user_message}%"),
                )
            )
            .limit(limit)
            .all()
        )

    if len(matched_ids) == 0:
        # If ES returns no hits, fallback to DB text search to keep chatbot useful.
        return (
            db.query(Product)
            .filter(Product.status == "active")
            .filter(
                or_(
                    Product.name.ilike(f"%{user_message}%"),
                    Product.description.ilike(f"%{user_message}%"),
                )
            )
            .limit(limit)
            .all()
        )

    # Keep returned order aligned with Elasticsearch relevance order
    products = (
        db.query(Product)
        .filter(Product.status == "active")
        .filter(Product.product_id.in_(matched_ids))
        .all()
    )

    products_by_id = {p.product_id: p for p in products}
    ordered = [products_by_id[pid] for pid in matched_ids if pid in products_by_id]
    return ordered[:limit]


def _format_products_for_prompt(products: List[Product]) -> str:
    if not products:
        return ""

    lines = [
        "\nHere are real products from the store database that match the user query.",
        "If the user asks for product recommendations, prioritize only these items:",
    ]
    for p in products:
        department_val = p.department.value if hasattr(p.department, "value") else str(p.department)
        lines.append(
            f"- {p.name} (ID: {p.product_id}, Price: ${p.price}, Status: {p.status}, Department: {department_val})"
        )
        if p.description:
            lines.append(f"  Description: {p.description[:120]}...")

    return "\n".join(lines)


def _format_products_for_user(products: List[Product]) -> str:
    if not products:
        return ""

    lines = ["", "Recommended products:"]
    for p in products:
        lines.append(f"- {p.name} (ID: {p.product_id}) - ${p.price}")
    return "\n".join(lines)


@router.post("/chat")
def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        # 1. RAG Retrieval: Elasticsearch first, DB fallback if ES is unavailable
        products = _get_products_for_chat(db, request.user_message, limit=5)
        context_text = _format_products_for_prompt(products)

        # 2. Build Gemini History
        system_context = f"""You are "Moda Assistant", a helpful customer service chatbot for MODA, a premium fashion e-commerce store.
You help customers with: finding products, sizing advice, order tracking, returns, styling tips, and promotions.
Be friendly, concise, and fashion-forward. Keep responses under 3 sentences unless a detailed answer is needed.
Shipping is free on orders over $150. Returns accepted within 30 days.
If product context is provided below, do not invent products outside that context.
{context_text}"""

        history_for_gemini = [
            {"role": "user", "parts": [{"text": system_context}]},
            {"role": "model", "parts": [{"text": "Understood! I'm ready to help MODA customers."}]}
        ]
        
        for msg in request.history:
            role = "user" if msg.sender_type == "user" else "model"
            history_for_gemini.append({
                "role": role,
                "parts": [{"text": msg.content}]
            })
            
        # 3. Generation
        model = genai.GenerativeModel("gemini-3.1-flash-lite")
        chat = model.start_chat(history=history_for_gemini)
        response = chat.send_message(request.user_message)

        final_text = (response.text or "").strip()
        # Always include concrete product lines when we found matched items.
        final_text += _format_products_for_user(products)

        return {
            "response": final_text,
            "products": [
                {
                    "id": p.product_id,
                    "product_id": p.product_id,
                    "name": p.name,
                    "title": p.name,
                    "base_price": float(p.price) if p.price is not None else None,
                    "price": float(p.price) if p.price is not None else None,
                    "status": p.status,
                    "category": p.category or "",
                    "description": (p.description[:100] + "...") if p.description and len(p.description) > 100 else p.description,
                }
                for p in products
            ],
        }
    except Exception as e:
        error_msg = str(e)
        print(f"Error in chat: {error_msg}")
        if "429" in error_msg or "quota" in error_msg.lower():
            return {"response": "I'm sorry, but my AI services are currently unavailable because the Gemini API key has exceeded its quota limits. Please add billing to your Google Cloud project or use a new API key."}
        raise HTTPException(status_code=500, detail=error_msg)


@router.get("/image-base64")
def image_base64(url: str = Query(..., description="Public image URL to fetch and encode")):
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Only http/https URLs are allowed")

    # Add a browser-like user-agent because some CDNs block default Python agents.
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})

    try:
        with urlopen(request, timeout=20) as response:
            content_type = response.headers.get("Content-Type", "image/jpeg")
            data = response.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not fetch image URL: {exc}") from exc

    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="URL did not return an image")

    return {
        "data": b64encode(data).decode("utf-8"),
        "mime_type": content_type,
    }
