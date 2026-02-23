from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from app.database import Base

class Review(Base):
    __tablename__ = "reviews"

    reviewid = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    comment = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    review_date = Column(DateTime, nullable=True)
