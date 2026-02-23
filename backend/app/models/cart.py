from sqlalchemy import Column, Integer, DateTime, ForeignKey, func
from app.database import Base

class ShoppingCart(Base):
    __tablename__ = "shopping_cart"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True, nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.variant_id"), primary_key=True, nullable=False)
    quantity = Column(Integer, default=1)
    added_at = Column(DateTime, default=func.now())
