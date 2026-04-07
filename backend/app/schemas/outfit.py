from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class OutfitProductBase(BaseModel):
    outfit_id: int
    variant_id: int

class OutfitProductCreate(OutfitProductBase):
    pass

class OutfitProductOut(OutfitProductBase):
    added_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class OutfitBase(BaseModel):
    user_id: int
    name: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[str] = None

class OutfitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    visibility: str = 'private'
    category_id: Optional[int] = None
    product_ids: List[int] = []

class OutfitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[str] = None
    category_id: Optional[int] = None
    product_ids: Optional[List[int]] = None

class OutfitOut(OutfitBase):
    outfit_id: int
    products: Optional[List[OutfitProductOut]] = None

    class Config:
        from_attributes = True
