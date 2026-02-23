from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.database import Base

class Outfit(Base):
    __tablename__ = "outfit"

    outfit_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    visibility = Column(String(50), nullable=True)


class OutfitProduct(Base):
    __tablename__ = "outfit_product"

    outfit_id = Column(Integer, ForeignKey("outfit.outfit_id"), primary_key=True, nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.variant_id"), primary_key=True, nullable=False)
    added_at = Column(DateTime, nullable=True)
