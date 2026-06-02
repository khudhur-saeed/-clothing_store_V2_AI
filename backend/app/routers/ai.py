import io
import os
import base64
import urllib.request
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from typing import List, Optional

from PIL import Image, ImageDraw, ImageFont
from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session
import google.generativeai as genai
import httpx

from app.core.config import settings
from app.core.cloud_storage import upload_ai_image
from app.dependencies import get_db, get_current_user
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.outfit import Outfit, OutfitProduct
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

        # Build a quick product_id -> first image URL map
        product_ids = [p.product_id for p in products]
        variants = (
            db.query(ProductVariant)
            .filter(ProductVariant.product_id.in_(product_ids))
            .all()
        )
        first_image_by_product = {}
        for v in variants:
            if v.product_id not in first_image_by_product:
                images = v.images or []
                if images:
                    img = images[0]
                    first_image_by_product[v.product_id] = img if isinstance(img, str) else (img.get("url") or img.get("src") or "")

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
                    "image_url": first_image_by_product.get(p.product_id, ""),
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
        "data": base64.b64encode(data).decode("utf-8"),
        "mime_type": content_type,
    }


# ---------------------------------------------------------------------------
# Helper: download an image from a URL and return raw bytes
# ---------------------------------------------------------------------------
def _download_image(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=20) as resp:
        return resp.read()


# ---------------------------------------------------------------------------
# Helper: create a Pillow outfit collage from a list of image byte arrays
# ---------------------------------------------------------------------------
def _build_outfit_collage(images_bytes: list[bytes], outfit_name: str) -> bytes:
    CELL = 320          # each product cell size (px)
    COLS = min(len(images_bytes), 3)
    ROWS = (len(images_bytes) + COLS - 1) // COLS
    PAD = 20
    HEADER = 60

    W = COLS * CELL + (COLS + 1) * PAD
    H = ROWS * CELL + (ROWS + 1) * PAD + HEADER

    canvas = Image.new("RGB", (W, H), (18, 18, 22))      # dark background

    # Header text
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except Exception:
        font = ImageFont.load_default()

    draw.text((PAD, PAD), outfit_name, fill=(220, 180, 255), font=font)

    for idx, img_bytes in enumerate(images_bytes):
        try:
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except Exception:
            continue

        img.thumbnail((CELL, CELL), Image.LANCZOS)
        # Centre-crop to exact cell size
        bg = Image.new("RGB", (CELL, CELL), (30, 30, 38))
        x_off = (CELL - img.width) // 2
        y_off = (CELL - img.height) // 2
        bg.paste(img, (x_off, y_off))

        col = idx % COLS
        row = idx // COLS
        x = PAD + col * (CELL + PAD)
        y = HEADER + PAD + row * (CELL + PAD)
        canvas.paste(bg, (x, y))

    buf = io.BytesIO()
    canvas.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Endpoint 1 – Generate AI Outfit Image (Pillow collage → Cloudinary)
# ---------------------------------------------------------------------------
@router.post("/generate-outfit-image")
def generate_outfit_image(
    outfit_id: int = Form(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Build a collage image from all products in an outfit, upload it to
    Cloudinary, persist the URL in the outfit row, and return the URL.
    """
    outfit = (
        db.query(Outfit)
        .filter(Outfit.outfit_id == outfit_id, Outfit.user_id == user.user_id)
        .first()
    )
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    # Collect variant image URLs for each product in the outfit
    outfit_products = (
        db.query(OutfitProduct).filter(OutfitProduct.outfit_id == outfit_id).all()
    )
    if not outfit_products:
        raise HTTPException(status_code=400, detail="Outfit has no products")

    image_urls: list[str] = []
    for op in outfit_products:
        variant = (
            db.query(ProductVariant)
            .filter(ProductVariant.variant_id == op.variant_id)
            .first()
        )
        if not variant:
            continue
        imgs = variant.images or []
        for img in imgs:
            url = img if isinstance(img, str) else (img.get("url") or img.get("src") or "")
            if url:
                image_urls.append(url)
                break  # one image per product is enough

    if not image_urls:
        raise HTTPException(status_code=400, detail="No product images found")

    # Download all product images
    images_bytes: list[bytes] = []
    for url in image_urls:
        try:
            images_bytes.append(_download_image(url))
        except Exception:
            pass  # skip broken URLs

    if not images_bytes:
        raise HTTPException(status_code=502, detail="Could not download any product images")

    # Build collage
    collage_bytes = _build_outfit_collage(images_bytes, outfit.name)

    # Upload to Cloudinary
    cloudinary_url = upload_ai_image(collage_bytes, user_id=user.user_id, folder_suffix="outfit_preview")

    # Persist the URL
    outfit.generated_image_url = cloudinary_url
    db.commit()

    return {"image_url": cloudinary_url, "outfit_id": outfit_id}


# ---------------------------------------------------------------------------
# Endpoint 2 – Virtual Try-On (Gemini 2.0 Flash → Cloudinary)
# ---------------------------------------------------------------------------
@router.post("/virtual-try-on")
async def virtual_try_on(
    product_id: int = Form(...),
    user_photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Accept the user's photo + a product ID. Pass both images to Gemini 2.0
    Flash image generation and return a virtual try-on result stored on
    Cloudinary.
    """
    # 1. Get product image
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product_id)
        .first()
    )
    product_image_url = ""
    if variant:
        imgs = variant.images or []
        for img in imgs:
            product_image_url = img if isinstance(img, str) else (img.get("url") or img.get("src") or "")
            if product_image_url:
                break

    if not product_image_url:
        raise HTTPException(status_code=400, detail="Product has no image")

    # 2. Read uploaded user photo
    user_photo_bytes = await user_photo.read()
    if not user_photo_bytes:
        raise HTTPException(status_code=400, detail="User photo is empty")

    # 3. Download product image
    try:
        product_image_bytes = _download_image(product_image_url)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not fetch product image: {exc}")

    # 4. Call Gemini 2.0 Flash image generation via REST API
    gemini_url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash-preview-image-generation:generateContent"
        f"?key={settings.VITE_GEMINI_API_KEY}"
    )

    user_mime = user_photo.content_type or "image/jpeg"

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            f"You are a virtual fashion try-on assistant. "
                            f"Generate a photorealistic image showing the person in the first photo "
                            f"wearing the '{product.name}' clothing item shown in the second photo. "
                            f"Preserve the person's face, skin tone, hair, and body shape exactly. "
                            f"The clothing should fit naturally and look realistic. "
                            f"Keep the same lighting and background style as the person's photo."
                        )
                    },
                    {
                        "inline_data": {
                            "mime_type": user_mime,
                            "data": base64.b64encode(user_photo_bytes).decode(),
                        }
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64.b64encode(product_image_bytes).decode(),
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["IMAGE", "TEXT"]
        },
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(gemini_url, json=payload)
            resp.raise_for_status()
            result = resp.json()
    except httpx.HTTPStatusError as exc:
        detail = f"Gemini API error {exc.response.status_code}: {exc.response.text[:300]}"
        raise HTTPException(status_code=502, detail=detail)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}")

    # 5. Extract image bytes from Gemini response
    generated_bytes: bytes | None = None
    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if "inlineData" in part:
                generated_bytes = base64.b64decode(part["inlineData"]["data"])
                break
            if "inline_data" in part:
                generated_bytes = base64.b64decode(part["inline_data"]["data"])
                break
        if generated_bytes:
            break

    if not generated_bytes:
        raise HTTPException(
            status_code=502,
            detail="Gemini did not return an image. The model may not support image generation for this input.",
        )

    # 6. Upload to Cloudinary
    cloudinary_url = upload_ai_image(generated_bytes, user_id=user.user_id, folder_suffix="try_on")

    return {
        "image_url": cloudinary_url,
        "product_id": product_id,
        "product_name": product.name,
    }

