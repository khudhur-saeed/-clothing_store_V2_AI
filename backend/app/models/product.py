from sqlalchemy import Column, Integer, String, Numeric, Text
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    product_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=True)
    status = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
