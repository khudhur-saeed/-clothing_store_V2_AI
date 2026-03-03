from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_admin_user
from app.models.product_variant import ProductVariant

router = APIRouter(prefix="/api/products", tags=["Variants"])


@router.get("/{product_id}/variants")
def get_variants(product_id: int, db: Session = Depends(get_db)):
    return db.query(ProductVariant).filter(ProductVariant.product_id == product_id).all()


@router.post("/{product_id}/variants")
def add_variant(
    product_id: int,
    color: str = None,
    size: str = None,
    stock: int = 0,
    images: str = None,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    variant = ProductVariant(
        product_id=product_id,
        color=color,
        size=size,
        stock=stock,
        images=images
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


@router.put("/variants/{variant_id}")
def update_variant(
    variant_id: int,
    color: str = None,
    size: str = None,
    stock: int = None,
    images: str = None,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    variant = db.query(ProductVariant).filter(ProductVariant.variant_id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    if color: variant.color = color
    if size: variant.size = size
    if stock is not None: variant.stock = stock
    if images: variant.images = images
    db.commit()
    db.refresh(variant)
    return variant


@router.delete("/variants/{variant_id}")
def delete_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    variant = db.query(ProductVariant).filter(ProductVariant.variant_id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    db.delete(variant)
    db.commit()
    return {"message": "Variant deleted"}