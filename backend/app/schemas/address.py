from pydantic import BaseModel
from typing import Optional

class AddressBase(BaseModel):
    user_id: int
    title: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    is_default: bool = False

class AddressCreate(AddressBase):
    pass

class AddressUpdate(BaseModel):
    title: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    is_default: Optional[bool] = None

class AddressOut(AddressBase):
    address_id: int

    class Config:
        from_attributes = True
