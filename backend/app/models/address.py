from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database import Base

class Address(Base):
    __tablename__ = "addresses"

    address_id = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title      = Column(String(50), nullable=True)
    street     = Column(String(255), nullable=True)
    city       = Column(String(100), nullable=True)
    country    = Column(String(100), nullable=True)
    zip_code   = Column(String(20), nullable=True)
    is_default = Column(Boolean, default=False)
