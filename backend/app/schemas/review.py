from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReviewBase(BaseModel):
    user_id: int
    product_id: int
    comment: Optional[str] = None
    rating: Optional[int] = None

class ReviewCreate(ReviewBase):
    pass

class ReviewUpdate(BaseModel):
    comment: Optional[str] = None
    rating: Optional[int] = None

class ReviewOut(ReviewBase):
    reviewid: int
    review_date: Optional[datetime] = None

    class Config:
        from_attributes = True
