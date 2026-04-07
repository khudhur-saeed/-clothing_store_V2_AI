from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.address import Address
from app.schemas.address import AddressUpdate

router = APIRouter(prefix="/api/addresses", tags=["Addresses"])


@router.get("/")
def get_addresses(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Address).filter(Address.user_id == current_user.user_id).all()


@router.post("/")
def add_address(
    payload: AddressUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    street = (payload.street or '').strip()
    city = (payload.city or '').strip()
    if not street or not city:
        raise HTTPException(status_code=400, detail="Street and city are required")

    is_default = bool(payload.is_default)
    if is_default:
        # Remove default from all other addresses first
        db.query(Address).filter(Address.user_id == current_user.user_id).update({"is_default": False})

    address = Address(
        user_id=current_user.user_id,
        title=(payload.title or '').strip() or None,
        street=street,
        city=city,
        country=(payload.country or '').strip() or None,
        zip_code=(payload.zip_code or '').strip() or None,
        is_default=is_default
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.put("/{address_id}")
def update_address(
    address_id: int,
    payload: AddressUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    address = db.query(Address).filter(
        Address.address_id == address_id,
        Address.user_id == current_user.user_id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    if payload.is_default is True:
        db.query(Address).filter(Address.user_id == current_user.user_id).update({"is_default": False})
        address.is_default = True
    elif payload.is_default is False:
        address.is_default = False

    if payload.title is not None:
        address.title = (payload.title or '').strip() or None
    if payload.street is not None:
        street = payload.street.strip()
        if not street:
            raise HTTPException(status_code=400, detail="Street cannot be empty")
        address.street = street
    if payload.city is not None:
        city = payload.city.strip()
        if not city:
            raise HTTPException(status_code=400, detail="City cannot be empty")
        address.city = city
    if payload.country is not None:
        address.country = (payload.country or '').strip() or None
    if payload.zip_code is not None:
        address.zip_code = (payload.zip_code or '').strip() or None

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


@router.get("/{address_id}/admin")
def get_address_admin(
    address_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_user) # simple check for now, assumes role is handled
):
    is_admin = getattr(admin, 'role', None) == 'admin'
    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    address = db.query(Address).filter(Address.address_id == address_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    return address
