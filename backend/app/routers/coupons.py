from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from datetime import date, datetime, time
from app.dependencies import get_db, get_current_user, get_admin_user
from app.database import engine
from app.models.coupon import Coupon
from app.schemas.coupon import CouponCreate, CouponUpdate

router = APIRouter(prefix="/api/coupons", tags=["Coupons"])


def ensure_coupon_datetime_columns():
    """Best-effort schema compatibility for existing DBs without migrations."""
    try:
        inspector = inspect(engine)
        if "coupons" not in inspector.get_table_names():
            return

        column_names = {c["name"] for c in inspector.get_columns("coupons")}
        statements = []
        if "start_at" not in column_names:
            statements.append("ALTER TABLE coupons ADD COLUMN start_at TIMESTAMP NULL")
        if "end_at" not in column_names:
            statements.append("ALTER TABLE coupons ADD COLUMN end_at TIMESTAMP NULL")

        if statements:
            with engine.begin() as conn:
                for stmt in statements:
                    conn.execute(text(stmt))
    except Exception:
        # Keep API running even if DB auto-migration fails.
        pass


ensure_coupon_datetime_columns()


# ── Customer: validate a coupon (MUST be before /{code} routes) ───────────
@router.get("/validate")
def validate_coupon(
    code: str,
    order_amount: float = 0,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    now = datetime.now()
    coupon = db.query(Coupon).filter(Coupon.coupon_code == code.upper()).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is not active")

    if coupon.start_at and now < coupon.start_at:
        raise HTTPException(status_code=400, detail="Coupon is not active yet")

    if coupon.end_at and now > coupon.end_at:
        raise HTTPException(status_code=400, detail="Coupon has expired")

    if not coupon.end_at and coupon.expiration_date and coupon.expiration_date < date.today():
        raise HTTPException(status_code=400, detail="Coupon has expired")
    if coupon.min_order_amount and order_amount < float(coupon.min_order_amount):
        raise HTTPException(status_code=400, detail=f"Minimum order amount is ${coupon.min_order_amount}")
    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    return {
        "coupon_code": coupon.coupon_code,
        "discount":    float(coupon.discount) if coupon.discount else 0,
    }


# ── Admin: list all coupons ───────────────────────────────────────────────
@router.get("/")
def get_coupons(db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    coupons = db.query(Coupon).all()
    return [
        {
            "coupon_code":      c.coupon_code,
            "discount":         float(c.discount) if c.discount else 0,
            "start_at":         c.start_at.isoformat() if c.start_at else None,
            "end_at":           c.end_at.isoformat() if c.end_at else None,
            "expiration_date":  str(c.expiration_date) if c.expiration_date else None,
            "min_order_amount": float(c.min_order_amount) if c.min_order_amount else 0,
            "usage_limit":      c.usage_limit or 100,
            "used_count":       c.used_count or 0,
            "is_active":        bool(c.is_active),
        }
        for c in coupons
    ]


# ── Admin: create coupon ──────────────────────────────────────────────────
@router.post("/")
def create_coupon(
    payload: CouponCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    if payload.discount is None:
        raise HTTPException(status_code=400, detail="Discount is required")

    existing = db.query(Coupon).filter(Coupon.coupon_code == payload.coupon_code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    start_at = payload.start_at
    end_at = payload.end_at
    expiration_date = payload.expiration_date

    if expiration_date and not end_at:
        end_at = datetime.combine(expiration_date, time.max)

    if start_at and end_at and start_at >= end_at:
        raise HTTPException(status_code=400, detail="Start date/time must be before end date/time")

    coupon = Coupon(
        coupon_code=payload.coupon_code.upper(),
        discount=payload.discount,
        start_at=start_at,
        end_at=end_at,
        expiration_date=expiration_date or (end_at.date() if end_at else None),
        min_order_amount=payload.min_order_amount,
        usage_limit=payload.usage_limit,
        used_count=0,
        is_active=payload.is_active,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return {"coupon_code": coupon.coupon_code, "message": "Coupon created"}


# ── Admin: update coupon ──────────────────────────────────────────────────
@router.put("/{code}")
def update_coupon(
    code: str,
    payload: CouponUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    coupon = db.query(Coupon).filter(Coupon.coupon_code == code.upper()).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    next_start = payload.start_at if payload.start_at is not None else coupon.start_at
    next_end = payload.end_at if payload.end_at is not None else coupon.end_at
    if payload.expiration_date is not None and payload.end_at is None:
        next_end = datetime.combine(payload.expiration_date, time.max)

    if next_start and next_end and next_start >= next_end:
        raise HTTPException(status_code=400, detail="Start date/time must be before end date/time")

    if payload.discount is not None:
        coupon.discount = payload.discount
    if payload.start_at is not None:
        coupon.start_at = payload.start_at
    if payload.end_at is not None:
        coupon.end_at = payload.end_at
    if payload.expiration_date is not None:
        coupon.expiration_date = payload.expiration_date
        if payload.end_at is None:
            coupon.end_at = datetime.combine(payload.expiration_date, time.max)
    if payload.min_order_amount is not None:
        coupon.min_order_amount = payload.min_order_amount
    if payload.usage_limit is not None:
        coupon.usage_limit = payload.usage_limit
    if payload.used_count is not None:
        coupon.used_count = payload.used_count
    if payload.is_active is not None:
        coupon.is_active = payload.is_active

    db.commit()
    return {"message": "Coupon updated"}


# ── Admin: delete coupon ──────────────────────────────────────────────────
@router.delete("/{code}")
def delete_coupon(code: str, db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    coupon = db.query(Coupon).filter(Coupon.coupon_code == code.upper()).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted"}
