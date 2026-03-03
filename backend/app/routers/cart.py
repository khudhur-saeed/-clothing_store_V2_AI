from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.cart import ShoppingCart
from app.models.product_variant import ProductVariant

router = APIRouter(prefix="/api/cart", tags=["Cart"])


@router.get("/")
def get_cart(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(ShoppingCart).filter(ShoppingCart.user_id == current_user.user_id).all()
    return items


@router.post("/")
def add_to_cart(
    variant_id: int,
    quantity: int = 1,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check variant exists
    variant = db.query(ProductVariant).filter(ProductVariant.variant_id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found")

    # If already in cart, increase quantity
    existing = db.query(ShoppingCart).filter(
        ShoppingCart.user_id == current_user.user_id,
        ShoppingCart.variant_id == variant_id
    ).first()

    if existing:
        existing.quantity += quantity
    else:
        item = ShoppingCart(user_id=current_user.user_id, variant_id=variant_id, quantity=quantity)
        db.add(item)

    db.commit()
    return {"message": "Added to cart"}


@router.put("/{variant_id}")
def update_cart_item(
    variant_id: int,
    quantity: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(ShoppingCart).filter(
        ShoppingCart.user_id == current_user.user_id,
        ShoppingCart.variant_id == variant_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")
    item.quantity = quantity
    db.commit()
    return {"message": "Updated"}


@router.delete("/{variant_id}")
def remove_from_cart(
    variant_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(ShoppingCart).filter(
        ShoppingCart.user_id == current_user.user_id,
        ShoppingCart.variant_id == variant_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")
    db.delete(item)
    db.commit()
    return {"message": "Removed from cart"}
