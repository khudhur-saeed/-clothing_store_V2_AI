from sqlalchemy import Column, Integer, String, Numeric, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship, synonym
from app.database import Base
import enum

class DepartmentEnum(enum.Enum):
    """Tier 1: Department/Target Group"""
    Men = "Men"
    Women = "Women"

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
    # Legacy target-group axis (kept for backward compatibility).
    department = Column(Enum(DepartmentEnum), nullable=False, default=DepartmentEnum.Women)

    # Canonical outfit slot field used by Outfit Builder.
    piece_type = Column("outfit_slot", Enum(OutfitSlotEnum), nullable=False, default=OutfitSlotEnum.Tops)
    # Backward-compatible alias for existing code/clients.
    outfit_slot = synonym("piece_type")

    # Strict relational link to Category table.
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    category_rel = relationship("Category", lazy="joined")

    # Legacy fields (string category is retained for response compatibility)
    category = Column(String(100), nullable=True)
    target_group = Column(String(50), nullable=True)
