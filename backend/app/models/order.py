from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    orderid = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    address_id = Column(Integer, ForeignKey("addresses.address_id"), nullable=True)
    order_date = Column(DateTime, nullable=True)
    payment = Column(String(50), nullable=True)
    coupon_code = Column(String(50), ForeignKey("coupons.coupon_code"), nullable=True)
    total_price = Column(Numeric(10, 2), nullable=True)


class OrderItem(Base):
    __tablename__ = "order_items"

    orderid = Column(Integer, ForeignKey("orders.orderid"), primary_key=True, nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.variant_id"), primary_key=True, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
