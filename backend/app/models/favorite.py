from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base

class Favorite(Base):
    __tablename__ = "favorites"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), primary_key=True, nullable=False)
