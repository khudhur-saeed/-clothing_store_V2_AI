from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from app.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    invoice_id = Column(Integer, primary_key=True, index=True)
    orderid = Column(Integer, ForeignKey("orders.orderid"), nullable=False)
    invoice_date = Column(DateTime, nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=True)
    tax_amount = Column(Numeric(10, 2), nullable=True)
    billing_address_id = Column(Integer, ForeignKey("addresses.address_id"), nullable=True)
