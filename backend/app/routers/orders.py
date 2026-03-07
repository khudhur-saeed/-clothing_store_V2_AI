from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.dependencies import get_db, get_current_user, get_admin_user
from app.models.order import Order, OrderItem
from app.models.cart import ShoppingCart
from app.models.product_variant import ProductVariant
from app.models.product import Product

router = APIRouter(prefix="/api/orders", tags=["Orders"])


# ── Place order ───────────────────────────────────────────────────────────
@router.post("/")
def place_order(
    address_id: int = None,
    payment: str = "card",
    coupon_code: str = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_items = db.query(ShoppingCart).filter(ShoppingCart.user_id == current_user.user_id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    order = Order(
        user_id=current_user.user_id,
        address_id=address_id,
        payment=payment,
        coupon_code=coupon_code,
        total_price=0,
        status="processing",
        order_date=datetime.utcnow()
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    for item in cart_items:
        order_item = OrderItem(
            orderid=order.orderid,
            variant_id=item.variant_id,
            quantity=item.quantity,
            unit_price=0
        )
        db.add(order_item)

    db.query(ShoppingCart).filter(ShoppingCart.user_id == current_user.user_id).delete()
    db.commit()
    return {"order_id": order.orderid, "message": "Order placed successfully"}


# ── My orders (customer) ──────────────────────────────────────────────────
@router.get("/")
def get_my_orders(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.user_id == current_user.user_id).order_by(Order.orderid.desc()).all()
    return [_serialize_order(o) for o in orders]


# ── All orders (admin only) ───────────────────────────────────────────────
@router.get("/all")
def get_all_orders(db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    orders = db.query(Order).order_by(Order.orderid.desc()).all()
    return [_serialize_order(o) for o in orders]


# ── Single order detail ───────────────────────────────────────────────────
@router.get("/{order_id}")
def get_order(order_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    # Admins can view any order; regular users only their own
    is_admin = getattr(current_user, 'role', None) == 'admin'
    q = db.query(Order).filter(Order.orderid == order_id)
    if not is_admin:
        q = q.filter(Order.user_id == current_user.user_id)
    order = q.first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    raw_items = db.query(OrderItem).filter(OrderItem.orderid == order_id).all()
    enriched_items = []
    for item in raw_items:
        variant = db.query(ProductVariant).filter(ProductVariant.variant_id == item.variant_id).first()
        product = db.query(Product).filter(Product.product_id == variant.product_id).first() if variant else None
        imgs = variant.images if variant else []
        image = (imgs[0] if isinstance(imgs, list) and imgs else "") if imgs else ""
        enriched_items.append({
            "variant_id":   item.variant_id,
            "product_id":   variant.product_id if variant else None,
            "product_name": product.name if product else "Unknown Product",
            "color":        variant.color if variant else "",
            "size":         variant.size  if variant else "",
            "quantity":     item.quantity,
            "unit_price":   float(item.unit_price) if item.unit_price else 0.0,
            "image":        image,
        })

    result = _serialize_order(order)
    result["items"] = enriched_items
    return result


# ── Update order status (admin only) ─────────────────────────────────────
@router.put("/{order_id}/status")
def update_order_status(
    order_id: int,
    status: str,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    order = db.query(Order).filter(Order.orderid == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    db.commit()
    return {"message": f"Order {order_id} status updated to '{status}'"}


# ── Shared serializer ─────────────────────────────────────────────────────
def _serialize_order(o):
    return {
        "orderid":     o.orderid,
        "user_id":     o.user_id,
        "order_date":  str(o.order_date) if o.order_date else None,
        "status":      o.status or "processing",
        "payment":     o.payment,
        "total_price": float(o.total_price) if o.total_price else 0.0,
        "address_id":  o.address_id,
    }
