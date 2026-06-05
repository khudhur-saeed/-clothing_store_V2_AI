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
# Endpoint 1 – Generate AI Outfit Image (gemini-2.5-flash-image → Cloudinary)
# ---------------------------------------------------------------------------
@router.post("/generate-outfit-image")
async def generate_outfit_image(
    outfit_id: int = Form(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Collect all product images from the outfit, send them to gemini-2.5-flash-image
    with a detailed mannequin prompt, upload the result to Cloudinary, and persist the URL.
    """
    outfit = (
        db.query(Outfit)
        .filter(Outfit.outfit_id == outfit_id, Outfit.user_id == user.user_id)
        .first()
    )
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    # -----------------------------------------------------------------------
    # Collect images AND metadata together in one parallel pass so we can
    # build per-image extraction directives later.
    # Each entry: {raw_bytes, mime, product_name, piece_type, category}
    # -----------------------------------------------------------------------
    outfit_products = (
        db.query(OutfitProduct).filter(OutfitProduct.outfit_id == outfit_id).all()
    )
    if not outfit_products:
        raise HTTPException(status_code=400, detail="Outfit has no products")

    product_image_data: list[dict] = []   # ordered, one per outfit slot

    for op in outfit_products:
        variant = (
            db.query(ProductVariant)
            .filter(ProductVariant.variant_id == op.variant_id)
            .first()
        )
        if not variant:
            continue

        product = db.query(Product).filter(Product.product_id == variant.product_id).first()
        if not product:
            continue

        # Resolve image URL
        image_url = ""
        for img in (variant.images or []):
            url = img if isinstance(img, str) else (img.get("url") or img.get("src") or "")
            if url:
                image_url = url
                break

        if not image_url:
            continue

        # Download image bytes
        try:
            raw = _download_image(image_url)
        except Exception:
            continue  # skip broken URLs

        lower_url = image_url.lower().split("?")[0]
        mime = "image/jpeg"
        if lower_url.endswith(".png"):
            mime = "image/png"
        elif lower_url.endswith(".webp"):
            mime = "image/webp"

        # Resolve piece_type string
        piece_type_str = (
            product.piece_type.value
            if product.piece_type and hasattr(product.piece_type, "value")
            else str(product.piece_type or "")
        ).strip()

        product_image_data.append({
            "raw": raw,
            "mime": mime,
            "name": product.name or product.category or "garment",
            "piece_type": piece_type_str or product.category or "garment",
            "category": product.category or "",
        })

    if not product_image_data:
        raise HTTPException(status_code=502, detail="Could not download any product images")

    # Build summary lists used in the prompt
    product_descriptions: list[str] = [entry["name"] for entry in product_image_data]
    clothing_description = ", ".join(product_descriptions) if product_descriptions else "the outfit shown in the images"

    # -----------------------------------------------------------------------
    # Build a strict item inventory so the AI knows EXACTLY what was uploaded
    # -----------------------------------------------------------------------
    item_count = len(product_descriptions)
    item_list_numbered = "\n".join(
        f"  {i+1}. {desc}" for i, desc in enumerate(product_descriptions)
    )

    # -----------------------------------------------------------------------
    # 10 professional branded prompt templates — one is chosen randomly
    # each call so regenerations produce visually distinct results.
    # [CLOTHING] is replaced with the actual product names.
    # NOTE: Every template is injected INTO the strict prompt below — the
    # creative direction applies ONLY to pose/scene, never to clothing content.
    # -----------------------------------------------------------------------
    import random

    POSE_TEMPLATES = [
        # 1. Standard E-commerce Hero Pose
        (
            "Pose: full-body centered hero pose, front-facing, arms relaxed naturally at the sides, "
            "perfect symmetry, clean luxury studio environment, soft professional lighting, "
            "high-end fashion catalog photography. In the background, a modern store sign "
            "reading 'Mode' is visible on a minimalist wall."
        ),
        # 2. Slight Angle Catalog Pose
        (
            "Pose: slight 30-45 degree body turn, one shoulder slightly forward to show garment shape, "
            "professional fashion catalog pose, clean studio background, softbox lighting. "
            "The word 'Mode' appears as a stylish store sign in the background."
        ),
        # 3. Walking Motion Pose
        (
            "Pose: mid-walking pose frozen in time, natural movement in legs and clothing folds, "
            "dynamic fashion advertising style, luxury studio environment, cinematic lighting. "
            "Behind the mannequin, a clean modern store interior with the brand name 'Mode' "
            "displayed as a wall sign."
        ),
        # 4. Editorial Fashion Pose
        (
            "Pose: high-fashion editorial stance, subtle body twist, expressive posture, "
            "luxury magazine style photography, dramatic soft lighting, minimal studio environment. "
            "The background includes a sleek 'Mode' store sign integrated into the wall design."
        ),
        # 5. Hands-in-Pockets Casual Pose
        (
            "Pose: relaxed casual with hands placed in pockets, natural weight shift on one leg, "
            "modern streetwear fashion style, premium studio lighting, clean background. "
            "The brand name 'Mode' is displayed as a minimalist store sign behind the mannequin."
        ),
        # 6. Product Front Focus
        (
            "Pose: perfectly centered, front-facing, symmetrical posture, "
            "optimized for online product display, neutral studio background, soft even lighting. "
            "Behind the mannequin, a subtle elegant store sign reading 'Mode'."
        ),
        # 7. Luxury Boutique Interior Scene
        (
            "Pose: placed inside a luxury boutique store environment, elegant interior design, "
            "warm lighting, premium retail aesthetic. The brand name 'Mode' appears as a "
            "stylish illuminated store sign on the back wall."
        ),
        # 8. Dynamic Twist Pose
        (
            "Pose: dynamic body twist showing garment movement and structure, "
            "fashion campaign style, cinematic studio lighting, modern luxury aesthetic. "
            "The background features a clean wall with the store sign 'Mode' integrated."
        ),
        # 9. Sitting / Leaning Pose
        (
            "Pose: seated or slightly leaning in a relaxed fashion pose, "
            "lifestyle fashion photography style, soft natural shadows, premium studio setup. "
            "In the background, a minimalist store interior with the brand name 'Mode' as a wall sign."
        ),
        # 10. Neon / Luxury Brand Look
        (
            "Pose: cinematic fashion studio with dramatic lighting, slightly dark environment, "
            "luxury advertising mood. Behind the mannequin, a glowing neon sign reading 'Mode', "
            "modern fashion brand aesthetic, high contrast."
        ),
    ]

    chosen_pose = random.choice(POSE_TEMPLATES)

    mannequin_prompt = (
        "════════════════════════════════════════════════════════\n"
        "MANDATORY RULES — VIOLATION = FAILED GENERATION\n"
        "════════════════════════════════════════════════════════\n\n"

        "❌ RULE 1 — NO REAL HUMANS:\n"
        "   Do NOT generate a real human being, human face, human skin, or live model.\n"
        "   Use ONLY a plastic store display mannequin — rigid, featureless, matte-finish, "
        "like a retail window dummy.\n\n"

        "❌ RULE 2 — STRICT CLOTHING INVENTORY (MOST IMPORTANT RULE):\n"
        f"   EXACTLY {item_count} clothing item(s) have been uploaded. "
        "The mannequin must wear ONLY and EXACTLY these items:\n"
        f"{item_list_numbered}\n\n"
        "   ⛔ DO NOT add ANY extra clothing, layer, or accessory that is NOT in the list above.\n"
        "   ⛔ DO NOT add shirts, jackets, hoodies, sweaters, scarves, belts, hats, or ANY garment\n"
        "      that was not uploaded — even if it looks 'natural' or 'complete' to you.\n"
        "   ⛔ DO NOT 'complete' the outfit. DO NOT 'style' it. DO NOT fill visual gaps.\n"
        "   ⛔ If only a T-shirt is uploaded, the mannequin wears ONLY that T-shirt — no shirt underneath, "
        "no jacket on top, nothing else.\n"
        "   ⛔ If only shorts are uploaded, the mannequin wears ONLY those shorts — no socks, "
        "no inner layer, no additional bottom garment.\n\n"

        "❌ RULE 3 — IGNORE INCIDENTAL GARMENTS IN PRODUCT PHOTOS (CRITICAL):\n"
        "   Product photos often show partial, background, or accidentally visible clothing\n"
        "   that is NOT the actual product being sold. You MUST ignore all of it.\n"
        "   The PRODUCT METADATA (name, category, garment type) is the SOLE source of truth —\n"
        "   NOT the raw visual content of the photo.\n"
        "   Examples of what to IGNORE:\n"
        "   ⛔ A shorts photo that shows a small t-shirt fragment at the top → ignore the t-shirt entirely\n"
        "   ⛔ A jacket photo worn over a shirt → ignore the shirt, extract ONLY the jacket\n"
        "   ⛔ A shoes photo with visible socks or trouser hem → ignore socks and trousers\n"
        "   ⛔ Any mannequin or model wearing other clothing in a product photo → ignore everything\n"
        "      except the named product type\n"
        "   ✅ For EACH image below, a per-image directive tells you the EXACT garment type\n"
        "      to extract. Extract ONLY that garment. Discard everything else visible.\n\n"

        "✅ RULE 4 — FAITHFUL REPRODUCTION:\n"
        "   Copy the exact color, texture, cut, stitching, logo, pattern, and branding\n"
        "   from the named garment in each product image.\n"
        "   Do NOT alter, reimagine, or interpret any design detail.\n\n"

        "✅ RULE 5 — FOOTWEAR:\n"
        "   If shoes/sneakers/boots are in the uploaded list, place them on the mannequin's feet.\n"
        "   If NO footwear was uploaded, the mannequin has NO shoes — bare feet or neutral mannequin feet only.\n\n"

        "PRE-GENERATION CHECKLIST — complete this mentally before drawing:\n"
        f"   [ ] I have identified exactly {item_count} uploaded item(s): {clothing_description}\n"
        "   [ ] I will dress the mannequin with ONLY these items and NOTHING ELSE\n"
        "   [ ] I will NOT add any unlisted garment, layer, or accessory\n"
        "   [ ] Every visible clothing piece on the mannequin matches an uploaded product image\n"
        "   [ ] I have read each per-image directive and will extract ONLY the named garment type\n\n"

        "════════════════════════════════════════════════════════\n"
        "SCENE & PHOTOGRAPHY DIRECTION:\n"
        "════════════════════════════════════════════════════════\n"
        f"{chosen_pose}\n"
        "Ultra realistic, sharp fabric details, 8k, high-end fashion e-commerce catalog photo.\n\n"

        "════════════════════════════════════════════════════════\n"
        "FINAL OUTPUT REQUIREMENT:\n"
        "════════════════════════════════════════════════════════\n"
        f"One image of a plastic retail display mannequin wearing EXACTLY AND ONLY: {clothing_description}.\n"
        "Zero extra clothing. Zero AI-added styling. Zero creative liberties with garments.\n"
        "Absolutely no real human beings.\n"
        "Each garment is taken ONLY from the named product in its per-image directive below."
    )

    # -----------------------------------------------------------------------
    # Build the multimodal parts list with PER-IMAGE directives.
    # Structure: [main_prompt, directive_1, image_1, directive_2, image_2, ...]
    #
    # Placing a text directive immediately before each image forces Gemini to
    # read what to extract BEFORE it processes the visual content, preventing
    # it from picking up incidental/background garments from the photo.
    # -----------------------------------------------------------------------
    parts = [{"text": mannequin_prompt}]

    for idx, entry in enumerate(product_image_data):
        slot_label = entry["piece_type"] or entry["category"] or "garment"
        per_image_directive = (
            f"━━━━ PRODUCT IMAGE {idx + 1} OF {item_count} ━━━━\n"
            f"Product name : {entry['name']}\n"
            f"Garment type : {slot_label}\n"
            f"EXTRACTION RULE: From this image, extract and use ONLY the {slot_label} named\n"
            f"  '{entry['name']}'.\n"
            f"IGNORE EVERYTHING ELSE in this image:\n"
            f"  ⛔ Any other clothing items visible (even partially) — IGNORE them completely\n"
            f"  ⛔ Background garments, mannequin clothing, model's own clothing — IGNORE\n"
            f"  ⛔ Any fabric, accessory, or garment that is NOT a {slot_label} — IGNORE\n"
            f"  ✅ Extract ONLY the {slot_label} with its exact color, texture, and design"
        )
        parts.append({"text": per_image_directive})
        parts.append({
            "inline_data": {
                "mime_type": entry["mime"],
                "data": base64.b64encode(entry["raw"]).decode(),
            }
        })

    OUTFIT_MODEL = "gemini-2.5-flash-image"
    gemini_url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{OUTFIT_MODEL}:generateContent"
        f"?key={settings.VITE_GEMINI_API_KEY}"
    )

    payload = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(gemini_url, json=payload)
            resp.raise_for_status()
            result = resp.json()
    except httpx.HTTPStatusError as exc:
        detail = f"Gemini API error {exc.response.status_code}: {exc.response.text[:500]}"
        print(f"[OutfitGen] {detail}")
        raise HTTPException(status_code=502, detail=detail)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}")

    # Extract generated image from response
    generated_bytes: bytes | None = None
    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                generated_bytes = base64.b64decode(inline["data"])
                break
        if generated_bytes:
            break

    if not generated_bytes:
        print(f"[OutfitGen] No image returned. Response: {str(result)[:600]}")
        raise HTTPException(
            status_code=502,
            detail="The AI did not return a generated image. Try adding more products to the outfit.",
        )

    # Upload to Cloudinary and persist
    cloudinary_url = upload_ai_image(generated_bytes, user_id=user.user_id, folder_suffix="outfit_preview")
    outfit.generated_image_url = cloudinary_url
    db.commit()

    return {"image_url": cloudinary_url, "outfit_id": outfit_id}


# ---------------------------------------------------------------------------
# Helper: map product category / piece_type to the required visible body region
# ---------------------------------------------------------------------------
def _get_required_body_region(piece_type: str, category: str) -> tuple[str, str]:
    """
    Returns (region_key, human_friendly_description).
    region_key is used internally; region_description goes into the Gemini prompt
    and into user-facing error messages.
    """
    combined = f"{piece_type} {category}".lower()

    # Footwear
    if any(k in combined for k in [
        "shoe", "boot", "sneaker", "sandal", "heel", "slipper",
        "footwear", "ayakkab", "\u00e7izme", "terlik",
    ]):
        return "feet", (
            "lower legs AND feet — both legs must be visible from the knee down to the toes"
        )

    # Lower body — includes Turkish sweatpants / track bottoms
    if any(k in combined for k in [
        "bottom", "pant", "jean", "trouser", "short", "skirt", "legging",
        "pantolon", "\u015fort", "etek", "tayt",
        "e\u015fofman", "sweatpant", "track", "alt\u0131", "alt ",
    ]):
        return "lower_body", (
            "lower body from the waist all the way down — "
            "both legs must be FULLY visible from the hip to at least the knee "
            "(not cropped, not cut off at the frame edge)"
        )

    # Full-body garments
    if any(k in combined for k in [
        "dress", "jumpsuit", "overall", "romper", "elbise", "tulum",
    ]):
        return "full_body", (
            "complete body from head to toe — "
            "both legs must be fully visible all the way to the feet"
        )

    # Tops / Outerwear / Accessories default — upper body
    return "upper_body", (
        "upper body from the shoulders to at least the waist — "
        "chest, shoulders and arms must be clearly visible"
    )


# ---------------------------------------------------------------------------
# Helper: validate photo for try-on — checks human presence + body region
# Uses the same direct REST API pattern as the try-on endpoint (proven to work).
# ---------------------------------------------------------------------------
async def _validate_photo_for_tryon(
    image_bytes: bytes,
    mime_type: str,
    product_name: str,
    region_description: str,
) -> tuple[bool, str]:
    """
    Sends the image to gemini-2.5-flash-lite via REST and checks TWO things in one call:
      1. Does the image contain a visible human person?
      2. Is the required body region (region_description) visible?

    Returns:
        (True, "")           – validation passed, safe to proceed with try-on
        (False, reason_str)  – validation failed, reason is a specific actionable message
    """
    CHECK_MODEL = "gemini-2.5-flash-lite"   # confirmed available & vision-capable
    gemini_url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{CHECK_MODEL}:generateContent"
        f"?key={settings.VITE_GEMINI_API_KEY}"
    )

    prompt = (
        f"You are a strict photo validator for a virtual clothing try-on system.\n"
        f"Clothing item to try on: '{product_name}'\n"
        f"Required body area that MUST be clearly in frame: {region_description}\n\n"
        f"STRICT RULES for answering Q2:\n"
        f"  - Answer YES only if the required body area is FULLY and CLEARLY visible.\n"
        f"  - Answer NO if any of these are true:\n"
        f"      * The required area is partially cropped or cut off at any edge of the photo.\n"
        f"      * The required area is barely visible (e.g. just the very top of pants).\n"
        f"      * The required area is hidden, blurred, or out of frame.\n"
        f"      * Only the waist/hip is visible but the legs/knees are NOT shown.\n\n"
        f"Respond with EXACTLY this two-line format and nothing else:\n"
        f"HUMAN: <YES or NO>\n"
        f"REGION: <YES or NO>\n\n"
        f"Q1 - HUMAN: Does the image contain a visible human person or human body?\n"
        f"Q2 - REGION: Is the required area ({region_description}) FULLY visible and not cropped?"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(image_bytes).decode(),
                        }
                    },
                ],
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(gemini_url, json=payload)

        print(f"[TryOn] Photo-validation HTTP status: {resp.status_code}")
        if not resp.is_success:
            print(f"[TryOn] Photo-validation API error: {resp.text[:500]}")
            raise HTTPException(
                status_code=502,
                detail=f"Photo validation service error ({resp.status_code}). Please try again."
            )

        result = resp.json()
        raw_text = ""
        for candidate in result.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "text" in part:
                    raw_text = part["text"].strip().upper()
                    break
            if raw_text:
                break

        print(f"[TryOn] Photo-validation answer: '{raw_text}'")

        has_human = "HUMAN: YES" in raw_text
        has_region = "REGION: YES" in raw_text

        if not has_human:
            return (
                False,
                "No human body detected in your photo. "
                "Please upload a clear photo of yourself."
            )

        if not has_region:
            return (
                False,
                f"This product requires your {region_description} to be visible. "
                f"Please upload a photo where the required area is clearly shown."
            )

        return True, ""

    except HTTPException:
        raise
    except Exception as exc:
        print(f"[TryOn] Photo-validation unexpected error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Could not validate your photo. Please try again."
        )


# ---------------------------------------------------------------------------
# Endpoint 2 – Virtual Try-On (gemini-2.5-flash-image via REST)
# ---------------------------------------------------------------------------
@router.post("/virtual-try-on")
async def virtual_try_on(
    product_id: int = Form(...),
    user_photo: UploadFile = File(...),
    product_image_url: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Accept the user's photo + a product ID (and optional resolved image URL).
    Sends both images to gemini-2.5-flash-image for virtual try-on generation.
    Returns the result image URL uploaded to Cloudinary.
    """
    # 1. Resolve product info
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 2. Resolve product image URL (frontend may supply it directly to avoid double-fetch)
    if not product_image_url:
        variant = (
            db.query(ProductVariant)
            .filter(ProductVariant.product_id == product_id)
            .first()
        )
        if variant:
            for img in (variant.images or []):
                candidate = img if isinstance(img, str) else (img.get("url") or img.get("src") or "")
                if candidate:
                    product_image_url = candidate
                    break

    if not product_image_url:
        raise HTTPException(status_code=400, detail="Product has no image")

    # 3. Read uploaded user photo
    user_photo_bytes = await user_photo.read()
    if not user_photo_bytes:
        raise HTTPException(status_code=400, detail="User photo is empty")
    user_mime = user_photo.content_type or "image/jpeg"

    # 3b. Smart photo validation: check human presence + required body region
    #     Determine the body region needed based on product category/piece_type.
    piece_type_str = product.piece_type.value if product.piece_type else ""
    category_str = product.category or ""
    _region_key, region_description = _get_required_body_region(piece_type_str, category_str)

    photo_ok, photo_reason = await _validate_photo_for_tryon(
        user_photo_bytes, user_mime, product.name, region_description
    )
    if not photo_ok:
        raise HTTPException(status_code=400, detail=photo_reason)

    # 4. Download product image
    try:
        product_image_bytes = _download_image(product_image_url)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not fetch product image: {exc}")

    # Detect product mime type from URL extension
    product_mime = "image/jpeg"
    lower_url = product_image_url.lower().split("?")[0]
    if lower_url.endswith(".png"):
        product_mime = "image/png"
    elif lower_url.endswith(".webp"):
        product_mime = "image/webp"

    # 5. Build a strong virtual try-on prompt
    category_hint = f" ({product.category})" if product.category else ""

    tryon_prompt = (
        f"You are an expert virtual fashion try-on system.\n\n"
        f"INPUTS:\n"
        f"- Image 1: A photo of a PERSON.\n"
        f"- Image 2: A fashion product called '{product.name}'{category_hint}.\n\n"
        f"YOUR TASK — follow every rule exactly:\n\n"
        f"STEP 1 — REMOVE the original clothing:\n"
        f"  • Completely erase EVERY part of the garment(s) the person is currently wearing "
        f"in the region covered by the new product.\n"
        f"  • This includes sleeves, collar, hem, cuffs — ALL of it must disappear.\n"
        f"  • Do NOT let ANY part of the original clothing remain visible underneath, "
        f"beside, or protruding from the new item. Zero layering.\n\n"
        f"STEP 2 — DRESS the person in the new product:\n"
        f"  • Place the '{product.name}' from Image 2 directly onto the person's body "
        f"as if they are physically wearing ONLY that item.\n"
        f"  • The product's exact colour, texture, pattern, logo, and cut from Image 2 "
        f"must be preserved faithfully on the person.\n"
        f"  • The garment must fit the person's body shape naturally — no floating fabric.\n\n"
        f"STEP 3 — PRESERVE the person:\n"
        f"  • The person's FACE, HAIR, SKIN TONE, BODY SHAPE, POSE, BACKGROUND, "
        f"and LIGHTING must remain IDENTICAL to Image 1.\n"
        f"  • Do not alter anything about them except their clothing.\n\n"
        f"OUTPUT: One single photorealistic image of the person wearing ONLY the '{product.name}', "
        f"looking like a professional e-commerce or fashion editorial photo."
    )

    # 6. Call gemini-2.5-flash-image via REST (generateContent with responseModalities IMAGE)
    TRYON_MODEL = "gemini-2.5-flash-image"
    gemini_url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{TRYON_MODEL}:generateContent"
        f"?key={settings.VITE_GEMINI_API_KEY}"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": tryon_prompt},
                    {
                        "inline_data": {
                            "mime_type": user_mime,
                            "data": base64.b64encode(user_photo_bytes).decode(),
                        }
                    },
                    {
                        "inline_data": {
                            "mime_type": product_mime,
                            "data": base64.b64encode(product_image_bytes).decode(),
                        }
                    },
                ],
            }
        ],
        "generationConfig": {
            "responseModalities": ["IMAGE", "TEXT"],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(gemini_url, json=payload)
            resp.raise_for_status()
            result = resp.json()
    except httpx.HTTPStatusError as exc:
        detail = f"Gemini API error {exc.response.status_code}: {exc.response.text[:500]}"
        print(f"[TryOn] {detail}")
        raise HTTPException(status_code=502, detail=detail)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}")

    # 7. Extract the generated image from the response
    generated_bytes: bytes | None = None
    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                generated_bytes = base64.b64decode(inline["data"])
                break
        if generated_bytes:
            break

    if not generated_bytes:
        # Log what the model actually returned for debugging
        print(f"[TryOn] No image in response. Full result: {str(result)[:800]}")
        raise HTTPException(
            status_code=502,
            detail=(
                "The AI model did not return a generated image. "
                "Try again with a clearer, front-facing full-body photo."
            ),
        )

    # 8. Upload result to Cloudinary and return URL
    cloudinary_url = upload_ai_image(generated_bytes, user_id=user.user_id, folder_suffix="try_on")

    return {
        "image_url": cloudinary_url,
        "product_id": product_id,
        "product_name": product.name,
    }

