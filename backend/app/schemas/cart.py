from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CartItemBase(BaseModel):
    variant_id: int
    quantity: int = 1

class CartItemCreate(CartItemBase):
    pass

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemOut(BaseModel):
    user_id: int
    variant_id: int
    quantity: int
    added_at: Optional[datetime] = None

    class Config:
        from_attributes = True
