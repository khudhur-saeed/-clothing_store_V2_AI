from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.database import engine
from app.dependencies import get_admin_user, get_db
from app.models.order import Order
from app.models.shipping import Shipping
from app.schemas.shipping import ShippingUpdate

router = APIRouter(prefix="/api/shipping", tags=["Shipping"])


def ensure_shipping_columns() -> None:
    """Best-effort compatibility for existing DBs without migrations."""
    try:
        inspector = inspect(engine)
        if "shipping" not in inspector.get_table_names():
            return

        column_names = {c["name"] for c in inspector.get_columns("shipping")}
        statements = []
        if "tracking_number" not in column_names:
            statements.append("ALTER TABLE shipping ADD COLUMN tracking_number VARCHAR(120) NULL")
        if "estimated_delivery" not in column_names:
            statements.append("ALTER TABLE shipping ADD COLUMN estimated_delivery TIMESTAMP NULL")

        if statements:
            with engine.begin() as conn:
                for stmt in statements:
                    conn.execute(text(stmt))
    except Exception:
        # Do not block API boot if DB auto-alter fails.
        pass


ensure_shipping_columns()


def _serialize_shipping_row(order: Order, shipping: Shipping | None) -> dict:
    return {
        "orderid": order.orderid,
        "shippingid": shipping.shippingid if shipping else None,
        "label": (shipping.label if shipping and shipping.label else "Carrier"),
        "tracking_number": shipping.tracking_number if shipping else None,
        "shipping_status": (shipping.shipping_status if shipping and shipping.shipping_status else (order.status or "processing")),
        "created_at": (shipping.created_at.isoformat() if shipping and shipping.created_at else (order.order_date.isoformat() if order.order_date else None)),
        "estimated_delivery": shipping.estimated_delivery.isoformat() if shipping and shipping.estimated_delivery else None,
    }


@router.get("/")
def get_all_shipping(db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    orders = db.query(Order).order_by(Order.orderid.desc()).all()
    shipping_rows = db.query(Shipping).all()
    shipping_by_order = {s.orderid: s for s in shipping_rows}

    return [_serialize_shipping_row(order, shipping_by_order.get(order.orderid)) for order in orders]


@router.put("/{order_id}")
def update_shipping(
    order_id: int,
    payload: ShippingUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    order = db.query(Order).filter(Order.orderid == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    shipping = db.query(Shipping).filter(Shipping.orderid == order_id).first()
    if not shipping:
        shipping = Shipping(
            orderid=order_id,
            shipping_status=order.status or "processing",
            label="Carrier",
            created_at=datetime.utcnow(),
        )
        db.add(shipping)
        db.flush()

    if payload.label is not None:
        shipping.label = payload.label
    if payload.tracking_number is not None:
        shipping.tracking_number = payload.tracking_number
    if payload.estimated_delivery is not None:
        shipping.estimated_delivery = payload.estimated_delivery
    if payload.shipping_status is not None:
        shipping.shipping_status = payload.shipping_status
        # Keep order status aligned with shipping status.
        order.status = payload.shipping_status

    db.commit()
    db.refresh(order)
    db.refresh(shipping)
    return _serialize_shipping_row(order, shipping)
