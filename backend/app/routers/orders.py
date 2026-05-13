from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.dependencies import get_db, get_current_user, get_admin_user
from app.models.order import Order, OrderItem
from app.models.cart import ShoppingCart
from app.models.product_variant import ProductVariant
from app.models.product import Product
from app.models.coupon import Coupon
from app.schemas.order import OrderStatusUpdate, PlaceOrderRequest

router = APIRouter(prefix="/api/orders", tags=["Orders"])


# ── Place order ───────────────────────────────────────────────────────────
@router.post("/")
def place_order(
    payload: PlaceOrderRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    address_id = payload.address_id
    payment = payload.payment
    coupon_code = payload.coupon_code
    cart_items = db.query(ShoppingCart).filter(ShoppingCart.user_id == current_user.user_id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Calculate prices
    total_price = 0.0
    order_items_data = []

    for item in cart_items:
        variant = db.query(ProductVariant).filter(ProductVariant.variant_id == item.variant_id).first()
        if not variant:
            continue
            
        product = db.query(Product).filter(Product.product_id == variant.product_id).first()
        if not product:
            continue
            
        unit_price = float(product.price)
        item_total = unit_price * item.quantity
        total_price += item_total
        
        order_items_data.append({
            "variant_id": item.variant_id,
            "quantity": item.quantity,
            "unit_price": unit_price
        })

    subtotal = total_price
    applied_coupon = None
    
    if coupon_code:
        coupon = db.query(Coupon).filter(Coupon.coupon_code == coupon_code.upper()).first()
        if not coupon or not getattr(coupon, 'is_active', True):
            raise HTTPException(status_code=400, detail="Invalid or inactive coupon")
            
        if coupon.used_count >= coupon.usage_limit:
            raise HTTPException(status_code=400, detail="Coupon usage limit reached")
            
        if subtotal < float(coupon.min_order_amount):
            raise HTTPException(status_code=400, detail=f"Minimum order amount for this coupon is ${coupon.min_order_amount}")
            
        # Check if user already used this coupon
        previous_use = db.query(Order).filter(Order.user_id == current_user.user_id, Order.coupon_code == coupon.coupon_code).first()
        if previous_use:
            raise HTTPException(status_code=400, detail="You have already used this coupon")

        discount_val = float(coupon.discount) / 100.0
        total_price = subtotal * (1.0 - discount_val)
        applied_coupon = coupon

    order = Order(
        user_id=current_user.user_id,
        address_id=address_id,
        payment=payment,
        coupon_code=coupon_code if applied_coupon else None,
        total_price=total_price,
        status="processing",
        order_date=datetime.utcnow()
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    for data in order_items_data:
        order_item = OrderItem(
            orderid=order.orderid,
            variant_id=data['variant_id'],
            quantity=data['quantity'],
            unit_price=data['unit_price']
        )
        db.add(order_item)

    if applied_coupon:
        applied_coupon.used_count += 1

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
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    order = db.query(Order).filter(Order.orderid == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = payload.status
    db.commit()
    return {"message": f"Order {order_id} status updated to '{payload.status}'"}


# ── Shared serializer ─────────────────────────────────────────────────────
def _serialize_order(o):
    return {
        "orderid":     o.orderid,
        "user_id":     o.user_id,
        "order_date":  str(o.order_date) if o.order_date else None,
        "status":      o.status or "processing",
        "payment":     o.payment,
        "coupon_code": o.coupon_code,
        "total_price": float(o.total_price) if o.total_price else 0.0,
        "address_id":  o.address_id,
    }
