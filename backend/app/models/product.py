from sqlalchemy import Column, Integer, String, Numeric, Text, Enum
from app.database import Base
import enum

class DepartmentEnum(enum.Enum):
    """Tier 1: Department/Target Group"""
    Men = "Men"
    Women = "Women"
    Boys = "Boys"
    Girls = "Girls"
    Unisex = "Unisex"

class OutfitSlotEnum(enum.Enum):
    """Tier 2: Outfit Slot/Piece Type"""
    Tops = "Tops"
    Bottoms = "Bottoms"
    Outerwear = "Outerwear"
    Shoes = "Shoes"
    Accessories = "Accessories"

class Product(Base):
    __tablename__ = "products"

    product_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=True)
    status = Column(String(50), nullable=True)
    # Two-Tier Classification System
    department = Column(Enum(DepartmentEnum), nullable=False, default=DepartmentEnum.Women)
    outfit_slot = Column(Enum(OutfitSlotEnum), nullable=False, default=OutfitSlotEnum.Tops)
    # Legacy fields (for backward compatibility during migration)
    category = Column(String(100), nullable=True)
    target_group = Column(String(50), nullable=True)
