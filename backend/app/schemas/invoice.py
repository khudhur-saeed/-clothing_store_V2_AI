from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class InvoiceBase(BaseModel):
    orderid: int
    total_amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    billing_address_id: Optional[int] = None

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(BaseModel):
    total_amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    billing_address_id: Optional[int] = None

class InvoiceOut(InvoiceBase):
    invoice_id: int
    invoice_date: Optional[datetime] = None

    class Config:
        from_attributes = True
