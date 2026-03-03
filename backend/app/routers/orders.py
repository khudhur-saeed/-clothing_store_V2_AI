from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.dependencies import get_db, get_current_user, get_admin_user
from app.models.order import Order, OrderItem
from app.models.cart import ShoppingCart

router = APIRouter(prefix="/api/orders", tags=["Orders"])


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


@router.get("/")
def get_my_orders(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.user_id == current_user.user_id).all()
    return orders


@router.get("/{order_id}")
def get_order(order_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.orderid == order_id,
        Order.user_id == current_user.user_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    items = db.query(OrderItem).filter(OrderItem.orderid == order_id).all()
    return {"order": order, "items": items}


@router.put("/{order_id}/status")
def update_order_status(
    order_id: int,
    payment: str,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    order = db.query(Order).filter(Order.orderid == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.payment = payment
    db.commit()
    return {"message": f"Order {order_id} updated"}
