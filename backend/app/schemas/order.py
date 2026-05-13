from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal

class OrderItemBase(BaseModel):
    variant_id: int
    quantity: int
    unit_price: Decimal

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemOut(OrderItemBase):
    orderid: int

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    user_id: int
    address_id: Optional[int] = None
    payment: Optional[str] = None
    coupon_code: Optional[str] = None
    total_price: Optional[Decimal] = None
    status: str = "processing"

class OrderCreate(OrderBase):
    items: Optional[List[OrderItemCreate]] = None

class OrderUpdate(BaseModel):
    address_id: Optional[int] = None
    payment: Optional[str] = None
    coupon_code: Optional[str] = None
    status: Optional[str] = None
    total_price: Optional[Decimal] = None

class OrderOut(OrderBase):
    orderid: int
    order_date: Optional[datetime] = None
    items: Optional[List[OrderItemOut]] = None

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: Literal["processing", "shipped", "out_for_delivery", "delivered", "cancelled"]

class PlaceOrderRequest(BaseModel):
    address_id: Optional[int] = None
    payment: str = "card"
    coupon_code: Optional[str] = None
