from fastapi import HTTPException, APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.dependencies import get_db, get_admin_user
from app.models.product import Product
from app.models.product_variant import ProductVariant

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("/")
def get_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(Product)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    if category:
        q = q.filter(Product.category == category)
    if min_price is not None:
        q = q.filter(Product.price >= min_price)
    if max_price is not None:
        q = q.filter(Product.price <= max_price)
    return q.all()


@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/")
def create_product(
    name: str,
    price: float,
    description: str = None,
    category: str = None,
    status: str = "active",
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    product = Product(name=name, price=price, description=description,
                      category=category, status=status)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}")
def update_product(
    product_id: int,
    name: str = None,
    price: float = None,
    description: str = None,
    category: str = None,
    status: str = None,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Prevent activating a product that has no variants or variants without images
    if status == "active":
        variants = db.query(ProductVariant).filter(ProductVariant.product_id == product_id).all()
        if not variants:
            raise HTTPException(
                status_code=400,
                detail="Cannot activate a product with no variants. Add at least one variant first."
            )
        for v in variants:
            imgs = v.images  # stored as JSON list
            if not imgs or (isinstance(imgs, list) and len(imgs) == 0):
                raise HTTPException(
                    status_code=400,
                    detail=f"All variants must have at least one image before activation. Variant {v.variant_id} has no images."
                )

    if name: product.name = name
    if price: product.price = price
    if description: product.description = description
    if category: product.category = category
    if status: product.status = status
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}