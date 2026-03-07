from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import date
from app.dependencies import get_db, get_current_user, get_admin_user
from app.models.coupon import Coupon

router = APIRouter(prefix="/api/coupons", tags=["Coupons"])


# ── Customer: validate a coupon (MUST be before /{code} routes) ───────────
@router.get("/validate")
def validate_coupon(
    code: str,
    order_amount: float = 0,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    coupon = db.query(Coupon).filter(Coupon.coupon_code == code.upper()).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is not active")
    if coupon.expiration_date and coupon.expiration_date < date.today():
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
    coupon_code: str,
    discount: float,
    expiration_date: str = None,
    min_order_amount: float = 0,
    usage_limit: int = 100,
    is_active: bool = True,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    existing = db.query(Coupon).filter(Coupon.coupon_code == coupon_code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    exp = None
    if expiration_date:
        try:
            exp = date.fromisoformat(expiration_date)
        except ValueError:
            pass

    coupon = Coupon(
        coupon_code=coupon_code.upper(),
        discount=discount,
        expiration_date=exp,
        min_order_amount=min_order_amount,
        usage_limit=usage_limit,
        used_count=0,
        is_active=is_active,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return {"coupon_code": coupon.coupon_code, "message": "Coupon created"}


# ── Admin: update coupon ──────────────────────────────────────────────────
@router.put("/{code}")
def update_coupon(
    code: str,
    is_active: bool = None,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    coupon = db.query(Coupon).filter(Coupon.coupon_code == code.upper()).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    if is_active is not None:
        coupon.is_active = is_active
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
