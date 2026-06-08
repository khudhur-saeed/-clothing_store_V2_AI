import io
import os
import base64
import re
import urllib.request
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from datetime import datetime
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
from app.dependencies import get_db, get_current_user, get_optional_current_user
from app.models.address import Address
from app.models.coupon import Coupon
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.outfit import Outfit, OutfitProduct
from app.models.shipping import Shipping

# Configure Gemini with the API key from environment variables
genai.configure(api_key=settings.VITE_GEMINI_API_KEY)

router = APIRouter(prefix="/api/ai", tags=["AI"])


class ChatMessage(BaseModel):
    sender_type: str
    content: str


class ChatRequest(BaseModel):
    history: List[ChatMessage]
    user_message: str


VERIFICATION_FALLBACK = "I could not verify this information from the available data source."
SIGN_IN_PROMPT = "Please sign in so I can safely look up your account-specific information."


def _clean_message(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _format_currency(value) -> str:
    try:
        return f"${float(value):.2f}"
    except Exception:
        return "$0.00"


def _extract_order_id(message: str) -> Optional[int]:
    patterns = [
        r"(?:order|order\s+no\.?|order\s+id|tracking)\s*#?\s*(\d+)",
        r"#(\d{3,})",
    ]
    for pattern in patterns:
        match = re.search(pattern, message, flags=re.IGNORECASE)
        if match:
            try:
                return int(match.group(1))
            except Exception:
                continue
    return None


def _extract_coupon_code(message: str) -> Optional[str]:
    patterns = [
        r"(?:coupon|code|promo|promotion|discount)\s*[:#-]?\s*([A-Z0-9][A-Z0-9_-]{2,})",
        r"\b([A-Z0-9][A-Z0-9_-]{3,})\b",
    ]
    upper_message = message.upper()
    for pattern in patterns:
        match = re.search(pattern, upper_message)
        if match:
            return match.group(1).strip().upper()
    return None


def _extract_product_hint(message: str) -> Optional[str]:
    lowered = message.lower()
    stop_words = {
        "what", "is", "the", "price", "of", "for", "my", "show", "me", "product",
        "products", "size", "sizes", "color", "colors", "stock", "inventory", "available",
        "available", "details", "detail", "about", "tell", "me", "this", "that", "item",
        "items", "variant", "variants", "dress", "shirt", "pants", "shoes", "top", "bottom",
        "outerwear", "accessories", "coupon", "code", "order", "orders", "track", "tracking",
        "shipping", "address", "status", "delivery", "refund", "coupon", "discount", "promo",
    }
    tokens = [token for token in re.split(r"[^a-z0-9]+", lowered) if token and token not in stop_words]
    if not tokens:
        return None
    if len(tokens) > 4:
        tokens = tokens[:4]
    return " ".join(tokens)


def _is_order_request(message: str) -> bool:
    lowered = message.lower()
    return any(keyword in lowered for keyword in ["order", "orders", "tracking", "track", "delivery", "refund", "shipping address", "shipping status"])


def _is_coupon_request(message: str) -> bool:
    lowered = message.lower()
    return any(keyword in lowered for keyword in ["coupon", "discount code", "promo", "promotion", "offer", "voucher"])


def _is_address_request(message: str) -> bool:
    lowered = message.lower()
    return any(keyword in lowered for keyword in ["address", "addresses", "shipping address", "default address"])


def _is_product_request(message: str) -> bool:
    lowered = message.lower()
    return any(keyword in lowered for keyword in ["product", "price", "size", "sizes", "color", "colors", "stock", "inventory", "available"])


def _product_image_url(variant: ProductVariant) -> str:
    images = variant.images or []
    for image in images:
        if isinstance(image, str) and image:
            return image
        if isinstance(image, dict):
            candidate = image.get("url") or image.get("src") or ""
            if candidate:
                return candidate
    return ""


def _format_product_result(product: Product, variants: List[ProductVariant]) -> dict:
    variant_rows = []
    colors = []
    sizes = []
    total_stock = 0

    for variant in variants:
        stock = max(int(variant.stock or 0), 0)
        total_stock += stock
        if variant.color and variant.color not in colors:
            colors.append(variant.color)
        if variant.size and variant.size not in sizes:
            sizes.append(variant.size)
        variant_rows.append({
            "variant_id": variant.variant_id,
            "color": variant.color or "",
            "size": variant.size or "One Size",
            "stock": stock,
            "image_url": _product_image_url(variant),
        })

    primary_image = next((row["image_url"] for row in variant_rows if row["image_url"]), "")
    department = product.department.value if hasattr(product.department, "value") else str(product.department or "")
    piece_type = product.piece_type.value if hasattr(product.piece_type, "value") else str(product.piece_type or "")

    return {
        "id": product.product_id,
        "product_id": product.product_id,
        "name": product.name,
        "title": product.name,
        "price": float(product.price) if product.price is not None else 0.0,
        "base_price": float(product.price) if product.price is not None else 0.0,
        "status": product.status,
        "category": product.category or "",
        "description": product.description or "",
        "image_url": primary_image,
        "sizes": sizes,
        "colors": colors,
        "total_stock": total_stock,
        "variants": variant_rows,
        "department": department,
        "piece_type": piece_type,
    }


def _translate_query_to_keywords(message: str) -> str:
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = (
            "You are a translation assistant for an e-commerce search engine. "
            "Translate the following user search query into simple, space-separated fashion keywords in Turkish and English. "
            "Output ONLY the translated keywords, with no explanation or punctuation. "
            f"Query: {message}"
        )
        response = model.generate_content(prompt)
        text = response.text.strip() if response.text else message
        return text
    except Exception as e:
        print(f"Query translation failed: {e}")
        return message


def _find_products(db: Session, message: str, limit: int = 3) -> List[Product]:
    # Translate query to fashion-focused English/Turkish keywords
    search_query = _translate_query_to_keywords(message)

    # 1. Try to search using Elasticsearch
    try:
        from app.core.search import search_products, _is_es_available
        if _is_es_available():
            es_ids = search_products(search_query)
            if es_ids:
                id_order = {id_: index for index, id_ in enumerate(es_ids)}
                products = (
                    db.query(Product)
                    .filter(Product.product_id.in_(es_ids), Product.status == "active")
                    .all()
                )
                products.sort(key=lambda p: id_order.get(p.product_id, 9999))
                return products[:limit]
    except Exception as es_err:
        print(f"Elasticsearch search error: {es_err}")

    # 2. Database Fallback (PostgreSQL ILIKE search)
    hint = _extract_product_hint(search_query)
    filters = [Product.status == "active"]
    if hint:
        like_value = f"%{hint}%"
        filters.append(or_(Product.name.ilike(like_value), Product.description.ilike(like_value)))
    else:
        tokens = [token for token in re.split(r"[^a-z0-9]+", search_query.lower()) if len(token) > 2]
        if not tokens:
            return []
        filters.append(or_(*[
            Product.name.ilike(f"%{token}%")
            for token in tokens[:4]
        ]))

    query = db.query(Product).filter(*filters)
    return query.limit(limit).all()


def _find_order_for_user(db: Session, current_user, message: str) -> Optional[Order]:
    order_id = _extract_order_id(message)
    query = db.query(Order).filter(Order.user_id == current_user.user_id)
    if order_id is not None:
        return query.filter(Order.orderid == order_id).first()

    return None


def _list_orders_for_user(db: Session, current_user, limit: int = 5) -> List[Order]:
    return (
        db.query(Order)
        .filter(Order.user_id == current_user.user_id)
        .order_by(Order.orderid.desc())
        .limit(limit)
        .all()
    )


def _serialize_order_for_chat(db: Session, order: Order) -> dict:
    items = (
        db.query(OrderItem)
        .filter(OrderItem.orderid == order.orderid)
        .all()
    )

    address = db.query(Address).filter(Address.address_id == order.address_id).first() if order.address_id else None
    shipping = db.query(Shipping).filter(Shipping.orderid == order.orderid).first()

    item_rows = []
    for item in items:
        variant = db.query(ProductVariant).filter(ProductVariant.variant_id == item.variant_id).first()
        product = db.query(Product).filter(Product.product_id == variant.product_id).first() if variant else None
        item_rows.append({
            "variant_id": item.variant_id,
            "product_id": variant.product_id if variant else None,
            "product_name": product.name if product else "Unknown Product",
            "color": variant.color if variant else "",
            "size": variant.size if variant else "",
            "quantity": item.quantity,
            "unit_price": float(item.unit_price) if item.unit_price is not None else 0.0,
        })

    address_text = None
    if address:
        parts = [address.title, address.street, address.city, address.country, address.zip_code]
        address_text = ", ".join([str(part) for part in parts if part])

    return {
        "orderid": order.orderid,
        "status": order.status or "processing",
        "order_date": order.order_date.isoformat() if order.order_date else None,
        "payment": order.payment or "",
        "coupon_code": order.coupon_code or None,
        "total_price": float(order.total_price) if order.total_price is not None else 0.0,
        "shipping_address": address_text,
        "shipping_status": shipping.shipping_status if shipping else None,
        "tracking_number": shipping.tracking_number if shipping else None,
        "estimated_delivery": shipping.estimated_delivery.isoformat() if shipping and shipping.estimated_delivery else None,
        "items": item_rows,
    }


def _valid_coupon_query(db: Session, code: Optional[str] = None, limit: int = 3) -> List[Coupon]:
    now = datetime.utcnow()
    query = db.query(Coupon)

    if code:
        return query.filter(Coupon.coupon_code == code.upper()).limit(1).all()

    return query.filter(
        Coupon.is_active.is_(True),
        or_(Coupon.start_at.is_(None), Coupon.start_at <= now),
        or_(Coupon.end_at.is_(None), Coupon.end_at >= now),
    ).limit(limit).all()


def _serialize_coupon_for_chat(coupon: Coupon) -> dict:
    now = datetime.utcnow()
    is_active = bool(coupon.is_active)
    within_start = not coupon.start_at or coupon.start_at <= now
    within_end = not coupon.end_at or coupon.end_at >= now
    if coupon.expiration_date and coupon.expiration_date < now.date():
        within_end = False

    return {
        "coupon_code": coupon.coupon_code,
        "discount": float(coupon.discount) if coupon.discount is not None else 0.0,
        "min_order_amount": float(coupon.min_order_amount) if coupon.min_order_amount is not None else 0.0,
        "usage_limit": coupon.usage_limit or 0,
        "used_count": coupon.used_count or 0,
        "start_at": coupon.start_at.isoformat() if coupon.start_at else None,
        "end_at": coupon.end_at.isoformat() if coupon.end_at else None,
        "expiration_date": coupon.expiration_date.isoformat() if coupon.expiration_date else None,
        "is_valid": bool(is_active and within_start and within_end and (coupon.usage_limit is None or (coupon.used_count or 0) < coupon.usage_limit)),
    }


def _respond_with_products(db: Session, message: str) -> dict:
    products = _find_products(db, message, limit=3)
    if not products:
        return {
            "response": VERIFICATION_FALLBACK,
            "products": [],
        }

    product_payloads = []
    response_lines = ["I found these products in the store database:"]
    for product in products:
        variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.product_id).all()
        payload = _format_product_result(product, variants)
        product_payloads.append(payload)

        size_text = ", ".join(payload["sizes"]) if payload["sizes"] else "no sizes recorded"
        color_text = ", ".join(payload["colors"]) if payload["colors"] else "no colors recorded"
        stock_text = "in stock" if payload["total_stock"] > 0 else "out of stock"
        response_lines.append(
            f"- {product.name}: price {_format_currency(payload['price'])}, sizes {size_text}, colors {color_text}, {stock_text}."
        )

    return {
        "response": "\n".join(response_lines),
        "products": product_payloads,
    }


def _respond_with_orders(db: Session, current_user, message: str) -> dict:
    if current_user is None:
        return {
            "response": SIGN_IN_PROMPT,
            "products": [],
        }

    order = _find_order_for_user(db, current_user, message)
    if order:
        payload = _serialize_order_for_chat(db, order)
        lines = [
            f"Order #{payload['orderid']} is {payload['status'] or 'processing' }.",
            f"Order date: {payload['order_date'] or 'unavailable' }.",
            f"Payment: {payload['payment'] or 'unavailable' }.",
            f"Total: {_format_currency(payload['total_price'])}.",
        ]
        if payload.get("shipping_status"):
            lines.append(f"Shipping status: {payload['shipping_status']}.")
        if payload.get("tracking_number"):
            lines.append(f"Tracking number: {payload['tracking_number']}.")
        if payload.get("estimated_delivery"):
            lines.append(f"Estimated delivery: {payload['estimated_delivery']}.")
        if payload.get("shipping_address"):
            lines.append(f"Shipping address: {payload['shipping_address']}.")

        item_lines = []
        for item in payload["items"]:
            item_lines.append(
                f"- {item['product_name']} x{item['quantity']} (size {item['size'] or 'unavailable'}, color {item['color'] or 'unavailable'})"
            )
        if item_lines:
            lines.append("Items:")
            lines.extend(item_lines)

        return {
            "response": "\n".join(lines),
            "products": [],
        }

    orders = _list_orders_for_user(db, current_user, limit=5)
    if not orders:
        return {
            "response": "No matching order was found for your account.",
            "products": [],
        }

    lines = ["Here are your recent orders:"]
    for order_row in orders:
        total = _format_currency(order_row.total_price)
        order_date = order_row.order_date.isoformat() if order_row.order_date else "unavailable"
        lines.append(f"- Order #{order_row.orderid}: {order_row.status or 'processing'}, placed {order_date}, total {total}.")

    return {
        "response": "\n".join(lines),
        "products": [],
    }


def _respond_with_coupons(db: Session, message: str) -> dict:
    code = _extract_coupon_code(message)
    coupons = _valid_coupon_query(db, code=code, limit=5)

    if not coupons:
        return {
            "response": "No valid coupon is available right now.",
            "products": [],
        }

    payloads = [_serialize_coupon_for_chat(coupon) for coupon in coupons]
    lines = []
    for coupon in payloads:
        validity = "valid" if coupon["is_valid"] else "not currently valid"
        lines.append(
            f"{coupon['coupon_code']}: {coupon['discount']:.0f}% off, minimum order {_format_currency(coupon['min_order_amount'])}, {validity}."
        )

    return {
        "response": "\n".join(lines),
        "products": [],
    }


def _respond_with_addresses(db: Session, current_user) -> dict:
    if current_user is None:
        return {
            "response": SIGN_IN_PROMPT,
            "products": [],
        }

    addresses = (
        db.query(Address)
        .filter(Address.user_id == current_user.user_id)
        .order_by(Address.is_default.desc(), Address.address_id.desc())
        .all()
    )

    if not addresses:
        return {
            "response": "No saved addresses were found for your account.",
            "products": [],
        }

    lines = ["Here are your saved addresses:"]
    for address in addresses:
        parts = [address.title, address.street, address.city, address.country, address.zip_code]
        address_text = ", ".join([str(part) for part in parts if part]) or "Address details unavailable"
        label = "default" if address.is_default else "saved"
        lines.append(f"- {label.capitalize()} address #{address.address_id}: {address_text}.")

    return {
        "response": "\n".join(lines),
        "products": [],
    }


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


SYSTEM_INSTRUCTIONS = """You are Moda Assistant, a professional shopping assistant for Moda, a premium fashion clothing store.
Your goal is to assist customers with product information, order details, shipping status, addresses, and available coupons.

Follow these strict formatting and presentation rules:

## Multilingual Support
- Detect the language of the user's message automatically (specifically Arabic, English, or Turkish).
- Respond in the exact same language used by the customer.
- Translate all labels, product display names, descriptions, colors, sizes, coupon details, order status, and metadata naturally into the detected language.
- For example, if the user asks in Arabic, all text, including fields like "Product Name", "Price", "Available Sizes", "Color", and error messages, must be fully in Arabic.
- If the user asks in Turkish, respond completely in Turkish (e.g., "Ürün Adı", "Fiyat", "Mevcut Bedenler", "Renk").
- If no matching products are found, respond with the translated equivalent of "No matching products were found" in the user's language (e.g. "Aradığınız kriterlere uygun ürün bulunamadı." for Turkish, or "لم يتم العثور على منتجات مطابقة." for Arabic).

## Response Formatting Rules
- Do NOT use any Markdown formatting in customer-facing responses.
- Do NOT use:
  * Asterisks (*)
  * Bullet lists
  * Markdown headings (#)
  * Code blocks (```)
  * Markdown emphasis (like bolding with ** or italics)
  * Markdown tables
- Generate plain text responses only.
- Use simple sentences and line breaks instead of Markdown.
- All responses must be clean, UI-friendly plain text suitable for direct display inside a website chat interface.

## Product Naming
- Do not display excessively long product titles exactly as stored in the database.
- Instead, use a clean, customer-friendly display name.
- Remove unnecessary repetitions and technical catalog wording (like percentages of cotton, specific Turkish pattern names, fabric details, etc.).
- Keep product names concise and readable, preserving important details such as product type, color, and fit.
- Example: Instead of "Solo Erkek %100 Organik Pamuklu Kalın Dokulu Comfort Fit Bisiklet Yakalı Lacivert T-shirt 1 Grimelange...", display "Solo Comfort Fit T-Shirt - Navy".

## Product Presentation
- Present products in a clean, minimal, and plain text structured format using line breaks.
- For each product, show ONLY:
  Product Name: [Name]
  Price: [Price]
  Available Sizes: [Sizes]
  Color: [Color]
- Do NOT expose:
  * Internal database identifiers (like ID: 326 or product_id)
  * Raw JSON
  * Hex color codes
  * Technical metadata
  * Inventory system fields (like stock count numbers)
  * Backend attributes or internal category codes

## Natural Language
- Sound like a professional shopping assistant.
- Use concise and modern language.
- Avoid generic phrases such as:
  * "I've found a few fantastic t-shirts for you"
  * "Here are some options"
  * "I hope this helps"
- Example preferred introductory phrasing:
  "Here are the available T-shirts matching your search:"

## Currency Handling
- Always use the store's configured currency ($).
- Never invent prices. Display prices exactly as returned by the database.

## Hallucination Prevention
- Only show products returned by the database.
- Never invent products, prices, discounts, colors, sizes, or availability.
- If the user is searching or asking for products, and no matching products are found in the database context, respond exactly with the translated equivalent of:
  "No matching products were found."

## Product Recommendation Rules
- Use only database results.
- Sort results by relevance.
- Prioritize products that are in stock.
- Limit responses to a reasonable number of products (3–5 by default).

## UI-Friendly Output
- Keep text minimal and avoid large paragraphs.
- Prefer clean plain text with simple line breaks that can easily be rendered as product cards or mobile-friendly layouts.
- Do not dump technical database fields.
"""


@router.post("/chat")
def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db), current_user=Depends(get_optional_current_user)):
    try:
        message = _clean_message(request.user_message)
        if not message:
            return {
                "response": "Hello! I am your Moda Assistant. How can I help you today?",
                "products": [],
            }

        # Retrieve dynamic product list from database based on search/query
        products = _find_products(db, message, limit=4)
        product_payloads = []
        if products:
            for product in products:
                variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.product_id).all()
                payload = _format_product_result(product, variants)
                product_payloads.append(payload)

        # Try to call Gemini first for a friendly, context-rich response
        try:
            # 1. Gather all database contexts
            context_parts = []
            
            # A. User Context
            if current_user:
                full_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "User"
                context_parts.append(
                    f"CURRENT_USER_INFO:\n"
                    f"- Name: {full_name}\n"
                    f"- Email: {current_user.email}\n"
                    f"- User ID: {current_user.user_id}\n"
                    f"- Status: Logged in"
                )
            else:
                context_parts.append(
                    "CURRENT_USER_INFO:\n"
                    "- Status: Guest (Not logged in)"
                )

            # B. Product Context
            if product_payloads:
                prod_context = ["PRODUCTS_MATCHING_QUERY:"]
                for p in product_payloads:
                    size_text = ", ".join(p["sizes"]) if p["sizes"] else "no sizes recorded"
                    color_text = ", ".join(p["colors"]) if p["colors"] else "no colors recorded"
                    stock_text = f"{p['total_stock']} in stock" if p["total_stock"] > 0 else "out of stock"
                    prod_context.append(
                        f"- Name: {p['name']}\n"
                        f"  ID: {p['product_id']}\n"
                        f"  Price: {_format_currency(p['price'])}\n"
                        f"  Sizes: {size_text}\n"
                        f"  Colors: {color_text}\n"
                        f"  Stock: {stock_text}\n"
                        f"  Description: {p['description'] or 'No description'}"
                    )
                context_parts.append("\n".join(prod_context))
            else:
                context_parts.append(
                    "PRODUCTS_MATCHING_QUERY:\n"
                    "- None found in database."
                )

            # C. Coupon Context
            coupons = _valid_coupon_query(db, limit=5)
            if coupons:
                coupon_context = ["AVAILABLE_ACTIVE_COUPONS:"]
                for coupon in coupons:
                    payload = _serialize_coupon_for_chat(coupon)
                    validity = "Valid" if payload["is_valid"] else "Not currently valid"
                    coupon_context.append(
                        f"- Code: {payload['coupon_code']}\n"
                        f"  Discount: {payload['discount']:.0f}%\n"
                        f"  Minimum Order: {_format_currency(payload['min_order_amount'])}\n"
                        f"  Validity: {validity}\n"
                        f"  Expiration Date: {payload['expiration_date'] or 'None'}"
                    )
                context_parts.append("\n".join(coupon_context))

            # D. Order Context
            if current_user:
                # Check for a specific order ID in message
                specific_order = _find_order_for_user(db, current_user, message)
                if specific_order:
                    payload = _serialize_order_for_chat(db, specific_order)
                    items_str = ", ".join([
                        f"{item['product_name']} x{item['quantity']} (Size: {item['size'] or 'N/A'}, Color: {item['color'] or 'N/A'})"
                        for item in payload["items"]
                    ])
                    order_context = [
                        f"SPECIFIC_ORDER_REQUESTED (Order #{payload['orderid']}):",
                        f"- Status: {payload['status']}",
                        f"- Date: {payload['order_date']}",
                        f"- Total Price: {_format_currency(payload['total_price'])}",
                        f"- Items: {items_str}",
                        f"- Shipping Status: {payload['shipping_status'] or 'Processing'}",
                        f"- Tracking Number: {payload['tracking_number'] or 'N/A'}",
                        f"- Estimated Delivery: {payload['estimated_delivery'] or 'N/A'}",
                        f"- Shipping Address: {payload['shipping_address'] or 'N/A'}"
                    ]
                    context_parts.append("\n".join(order_context))
                
                # Fetch recent orders
                recent_orders = _list_orders_for_user(db, current_user, limit=5)
                if recent_orders:
                    orders_context = ["USER_RECENT_ORDERS:"]
                    for order in recent_orders:
                        total = _format_currency(order.total_price)
                        order_date = order.order_date.isoformat() if order.order_date else "N/A"
                        orders_context.append(
                            f"- Order #{order.orderid}: status={order.status or 'processing'}, total={total}, placed={order_date}"
                        )
                    context_parts.append("\n".join(orders_context))
            
            # E. Address Context
            if current_user:
                addresses = (
                    db.query(Address)
                    .filter(Address.user_id == current_user.user_id)
                    .order_by(Address.is_default.desc(), Address.address_id.desc())
                    .all()
                )
                if addresses:
                    addr_context = ["USER_SAVED_ADDRESSES:"]
                    for address in addresses:
                        parts = [address.title, address.street, address.city, address.country, address.zip_code]
                        address_text = ", ".join([str(part) for part in parts if part]) or "N/A"
                        label = "Default" if address.is_default else "Saved"
                        addr_context.append(f"- {label} Address #{address.address_id}: {address_text}")
                    context_parts.append("\n".join(addr_context))

            database_context = "\n\n".join(context_parts)

            # Build Chat History for Gemini Prompt
            formatted_history = []
            for msg in request.history:
                # Skip static instructions / system fallbacks to keep history clean
                if "I can verify orders" in msg.content or "I could not verify" in msg.content:
                    continue
                role = "user" if msg.sender_type == "user" else "model"
                content = msg.content[:500] if msg.content else ""
                if content.strip():
                    formatted_history.append({"role": role, "parts": [content]})
            
            # Initialize model with system instructions
            model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=SYSTEM_INSTRUCTIONS)
            
            contents = []
            for h in formatted_history:
                contents.append(h)
                    
            final_prompt = (
                f"=== DATABASE CONTEXT ===\n"
                f"{database_context}\n"
                f"========================\n\n"
                f"User Query: {message}"
            )
            contents.append({"role": "user", "parts": [final_prompt]})
            
            response = model.generate_content(contents)
            response_text = response.text.strip()
            
            return {
                "response": response_text,
                "products": product_payloads,
            }
        except Exception as gemini_err:
            print(f"Gemini chat error: {gemini_err}. Falling back to rule-based response.")
            
            if _is_order_request(message):
                return _respond_with_orders(db, current_user, message)

            if _is_address_request(message):
                return _respond_with_addresses(db, current_user)

            if _is_coupon_request(message):
                return _respond_with_coupons(db, message)

            if _is_product_request(message):
                return _respond_with_products(db, message)

            return {
                "response": "I can verify orders, coupons, and product details from the store database. Ask me about a specific order number, coupon code, or product name.",
                "products": product_payloads,
            }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"Error in chat: {error_msg}")
        raise HTTPException(status_code=500, detail=VERIFICATION_FALLBACK)
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"Error in chat: {error_msg}")
        raise HTTPException(status_code=500, detail=VERIFICATION_FALLBACK)


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
        f"- Image 1: A photo of a target PERSON (this is the user who wants to try on the clothing).\n"
        f"- Image 2: A fashion product image showing '{product.name}'{category_hint}.\n\n"
        f"CRITICAL WARNING ON IDENTITY AND REFERENCE:\n"
        f"Image 2 (the product image) may show a human model wearing the garment. You must treat Image 2 EXCLUSIVELY as a clothing/garment reference. Do NOT copy, blend, or reference any identity details of the model shown in Image 2. The target person from Image 1 is the ONLY source of identity information. Ignore the model's face, hair, eyes, nose, lips, skin tone, body shape, hands, neck, pose, and background from Image 2 completely.\n\n"
        f"YOUR TASK — follow every rule exactly:\n\n"
        f"STEP 1 — PRESERVE THE TARGET PERSON'S IDENTITY (FROM IMAGE 1):\n"
        f"  • The target person's FACE, HAIR, SKIN TONE, BODY SHAPE, BODY PROPORTIONS, POSE, EXPRESSION, and LIGHTING in the output must remain 100% IDENTICAL to Image 1.\n"
        f"  • Do not replace or modify the target person's face, features, hairstyle, skin color, hands, or pose. Do not blend any model features from Image 2 into the target person.\n\n"
        f"STEP 2 — REMOVE THE TARGET PERSON'S ORIGINAL CLOTHING (FROM IMAGE 1):\n"
        f"  • Completely erase the garment(s) the target person is wearing in the region to be covered by the new product.\n"
        f"  • This includes sleeves, cuffs, collar, hem, and any protruding fabrics. Zero original clothing parts should peek out or layer underneath.\n\n"
        f"STEP 3 — TRANSFER ONLY THE GARMENT (FROM IMAGE 2):\n"
        f"  • Transfer ONLY the garment of '{product.name}' shown in Image 2 onto the target person's body from Image 1.\n"
        f"  • Fully ignore the model's face, hair, skin, hands, neck, body, pose, background, accessories, furniture, or other non-clothing items in Image 2.\n"
        f"  • Fit the garment naturally to the target person's body shape, proportions, and pose from Image 1. Keep the exact color, texture, print, pattern, design, and details of the garment from Image 2.\n\n"
        f"OUTPUT: One single photorealistic image of the target person from Image 1 wearing the new garment from Image 2, keeping the target person's identity and background 100% unchanged."
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

