from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.cart import ShoppingCart
from app.models.product_variant import ProductVariant
from app.models.product import Product
from app.schemas.cart import CartItemCreate, CartItemUpdate

router = APIRouter(prefix="/api/cart", tags=["Cart"])


@router.get("/")
def get_cart(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(ShoppingCart).filter(ShoppingCart.user_id == current_user.user_id).all()
    result = []
    for item in items:
        variant = db.query(ProductVariant).filter(ProductVariant.variant_id == item.variant_id).first()
        product = db.query(Product).filter(Product.product_id == variant.product_id).first() if variant else None
        
        # Only include items from active products
        if product and product.status == 'active':
            result.append({
                "variant_id":  item.variant_id,
                "product_id":  variant.product_id if variant else None,
                "name":        product.name if product else "Unknown Product",
                "price":       float(product.price) if product and product.price else 0.0,
                "color":       variant.color if variant else "",
                "size":        variant.size  if variant else "",
                "stock":       variant.stock if variant else 0,
                "images":      variant.images if variant else [],
                "quantity":    item.quantity,
            })
    return result


@router.post("/")
def add_to_cart(
    payload: CartItemCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    variant_id = payload.variant_id
    quantity = int(payload.quantity or 0)

    if quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    
    # Check variant exists
    variant = db.query(ProductVariant).filter(ProductVariant.variant_id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found")
    
    # Check if product is active
    product = db.query(Product).filter(Product.product_id == variant.product_id).first()
    if not product or product.status != 'active':
        raise HTTPException(status_code=404, detail="Product not available")

    stock = int(variant.stock or 0)
    if stock <= 0:
        raise HTTPException(status_code=400, detail="This variant is out of stock")

    # If already in cart, increase quantity
    existing = db.query(ShoppingCart).filter(
        ShoppingCart.user_id == current_user.user_id,
        ShoppingCart.variant_id == variant_id
    ).first()

    current_qty = int(existing.quantity or 0) if existing else 0
    requested_total = current_qty + quantity
    if requested_total > stock:
        raise HTTPException(status_code=400, detail=f"Only {stock} item(s) available in stock")

    if existing:
        existing.quantity = requested_total
    else:
        item = ShoppingCart(user_id=current_user.user_id, variant_id=variant_id, quantity=quantity)
        db.add(item)

    db.commit()
    return {"message": "Added to cart"}


@router.put("/{variant_id}")
def update_cart_item(
    variant_id: int,
    payload: CartItemUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(ShoppingCart).filter(
        ShoppingCart.user_id == current_user.user_id,
        ShoppingCart.variant_id == variant_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")

    quantity = int(payload.quantity or 0)
    if quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    variant = db.query(ProductVariant).filter(ProductVariant.variant_id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found")

    stock = int(variant.stock or 0)
    if quantity > stock:
        raise HTTPException(status_code=400, detail=f"Only {stock} item(s) available in stock")

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
