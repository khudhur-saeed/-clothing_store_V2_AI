from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.address import Address

router = APIRouter(prefix="/api/addresses", tags=["Addresses"])


@router.get("/")
def get_addresses(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Address).filter(Address.user_id == current_user.user_id).all()


@router.post("/")
def add_address(
    street: str,
    city: str,
    country: str = None,
    zip_code: str = None,
    is_default: bool = False,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if is_default:
        # Remove default from all other addresses first
        db.query(Address).filter(Address.user_id == current_user.user_id).update({"is_default": False})

    address = Address(
        user_id=current_user.user_id,
        street=street,
        city=city,
        country=country,
        zip_code=zip_code,
        is_default=is_default
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.put("/{address_id}/default")
def set_default_address(
    address_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Address).filter(Address.user_id == current_user.user_id).update({"is_default": False})
    address = db.query(Address).filter(
        Address.address_id == address_id,
        Address.user_id == current_user.user_id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    address.is_default = True
    db.commit()
    return {"message": "Default address updated"}


@router.delete("/{address_id}")
def delete_address(
    address_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    address = db.query(Address).filter(
        Address.address_id == address_id,
        Address.user_id == current_user.user_id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(address)
    db.commit()
    return {"message": "Address deleted"}
