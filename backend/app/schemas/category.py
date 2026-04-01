from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None

class CategoryOut(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CategoryWithChildren(CategoryOut):
    """Backwards-compatible shape; children is always empty in standalone mode."""
    children: List['CategoryOut'] = []

    class Config:
        from_attributes = True

CategoryWithChildren.model_rebuild()
