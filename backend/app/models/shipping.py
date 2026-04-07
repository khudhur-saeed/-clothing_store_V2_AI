from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from app.database import Base

class Shipping(Base):
    __tablename__ = "shipping"

    shippingid = Column(Integer, primary_key=True, index=True)
    orderid = Column(Integer, ForeignKey("orders.orderid"), nullable=False)
    shipping_status = Column(String(50), nullable=True)
    label = Column(String(100), nullable=True)
    tracking_number = Column(String(120), nullable=True)
    estimated_delivery = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=True, default=func.now())
