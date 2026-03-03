from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.types import JSON
from app.database import Base

class ProductVariant(Base):
    __tablename__ = "product_variants"

    variant_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    color = Column(String(50), nullable=True)
    size = Column(String(20), nullable=True)
    stock = Column(Integer, default=0)
    images = Column(JSON, nullable=True, default=list)   # list of image URL strings
