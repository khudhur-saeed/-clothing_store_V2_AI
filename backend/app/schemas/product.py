from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[Decimal] = None
    status: Optional[str] = None
    category: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    status: Optional[str] = None
    category: Optional[str] = None

class ProductOut(ProductBase):
    product_id: int

    class Config:
        from_attributes = True


class AdminProductCreate(BaseModel):
    name: str
    price: Decimal
    description: Optional[str] = None
    status: Optional[str] = "inactive"
    category: Optional[str] = None
    department: Optional[str] = None
    clothing_type: Optional[str] = None
    outfit_slot: Optional[str] = None


class AdminProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[Decimal] = None
    description: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    clothing_type: Optional[str] = None
    outfit_slot: Optional[str] = None
