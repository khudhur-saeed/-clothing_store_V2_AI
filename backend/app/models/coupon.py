from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, Text
from app.database import Base

class Coupon(Base):
    __tablename__ = "coupons"

    coupon_code = Column(String(50), primary_key=True, index=True)
    discount = Column(Numeric(5, 2), nullable=True)
    expiration_date = Column(Date, nullable=True)
