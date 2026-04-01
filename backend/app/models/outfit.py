from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from app.database import Base
from datetime import datetime

class Outfit(Base):
    __tablename__ = "outfit"

    outfit_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    visibility = Column(String(50), nullable=True, default='private')  # 'public' or 'private'
    department = Column(String(50), nullable=True)  # Men, Women, Boys, Girls, Unisex
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class OutfitProduct(Base):
    __tablename__ = "outfit_product"

    outfit_id = Column(Integer, ForeignKey("outfit.outfit_id"), primary_key=True, nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.variant_id"), primary_key=True, nullable=False)
    added_at = Column(DateTime, nullable=True)
