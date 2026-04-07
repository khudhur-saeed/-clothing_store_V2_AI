from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean
from app.database import Base

class Coupon(Base):
    __tablename__ = "coupons"

    coupon_code      = Column(String(50), primary_key=True, index=True)
    discount         = Column(Numeric(5, 2), nullable=True)
    start_at         = Column(DateTime, nullable=True)
    end_at           = Column(DateTime, nullable=True)
    expiration_date  = Column(Date, nullable=True)
    min_order_amount = Column(Numeric(10, 2), default=0)
    usage_limit      = Column(Integer, default=100)
    used_count       = Column(Integer, default=0)
    is_active        = Column(Boolean, default=True)
