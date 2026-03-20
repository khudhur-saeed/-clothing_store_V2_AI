from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    # Self-referential relationship for parent/child categories
    subcategories = relationship("Category")
