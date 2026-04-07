from pydantic import BaseModel
from typing import Optional, Literal
from decimal import Decimal

ProductStatus = Literal["active", "inactive"]
ProductPieceType = Literal["Tops", "Bottoms", "Outerwear", "Shoes", "Accessories"]

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[Decimal] = None
    status: Optional[ProductStatus] = None
    category_id: Optional[int] = None
    category: Optional[str] = None
    piece_type: Optional[ProductPieceType] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    status: Optional[ProductStatus] = None
    category_id: Optional[int] = None
    category: Optional[str] = None
    piece_type: Optional[ProductPieceType] = None

class ProductOut(ProductBase):
    product_id: int

    class Config:
        from_attributes = True


class AdminProductCreate(BaseModel):
    name: str
    price: Decimal
    description: Optional[str] = None
    status: ProductStatus = "inactive"
    category_id: int
    piece_type: ProductPieceType


class AdminProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[Decimal] = None
    description: Optional[str] = None
    status: Optional[ProductStatus] = None
    category_id: Optional[int] = None
    piece_type: Optional[ProductPieceType] = None
