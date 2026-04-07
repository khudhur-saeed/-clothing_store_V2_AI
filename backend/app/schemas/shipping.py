from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ShippingBase(BaseModel):
    orderid: int
    shipping_status: Optional[str] = None
    label: Optional[str] = None
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None

class ShippingCreate(ShippingBase):
    pass

class ShippingUpdate(BaseModel):
    shipping_status: Optional[str] = None
    label: Optional[str] = None
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None

class ShippingOut(ShippingBase):
    shippingid: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
