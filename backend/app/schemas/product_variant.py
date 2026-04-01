from pydantic import BaseModel
from typing import Optional, List

class ProductVariantBase(BaseModel):
    product_id: int
    color: Optional[str] = None
    size: Optional[str] = None
    stock: int = 0
    images: Optional[List[str]] = None

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantUpdate(BaseModel):
    color: Optional[str] = None
    size: Optional[str] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None

class ProductVariantOut(ProductVariantBase):
    variant_id: int

    class Config:
        from_attributes = True
