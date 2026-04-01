from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal

class CouponBase(BaseModel):
    coupon_code: str
    discount: Optional[Decimal] = None
    expiration_date: Optional[date] = None
    min_order_amount: Decimal = 0
    usage_limit: int = 100
    used_count: int = 0
    is_active: bool = True

class CouponCreate(CouponBase):
    pass

class CouponUpdate(BaseModel):
    discount: Optional[Decimal] = None
    expiration_date: Optional[date] = None
    min_order_amount: Optional[Decimal] = None
    usage_limit: Optional[int] = None
    used_count: Optional[int] = None
    is_active: Optional[bool] = None

class CouponOut(CouponBase):
    class Config:
        from_attributes = True
