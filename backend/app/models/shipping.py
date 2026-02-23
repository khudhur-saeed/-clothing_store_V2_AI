from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.database import Base

class Shipping(Base):
    __tablename__ = "shipping"

    shippingid = Column(Integer, primary_key=True, index=True)
    orderid = Column(Integer, ForeignKey("orders.orderid"), nullable=False)
    shipping_status = Column(String(50), nullable=True)
    label = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=True)
