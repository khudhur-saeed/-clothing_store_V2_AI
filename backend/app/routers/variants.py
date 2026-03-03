from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.dependencies import get_db, get_admin_user
from app.models.product_variant import ProductVariant

router = APIRouter(prefix="/api/products", tags=["Variants"])


# ── Request body for creating/updating a variant ──────────────────────────────
class VariantCreate(BaseModel):
    color: Optional[str] = None
    size: Optional[str] = None
    stock: int = 0
    images: List[str] = []   # list of image URL strings


class VariantUpdate(BaseModel):
    color: Optional[str] = None
    size: Optional[str] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/{product_id}/variants")
def get_variants(product_id: int, db: Session = Depends(get_db)):
    return db.query(ProductVariant).filter(ProductVariant.product_id == product_id).all()


@router.post("/{product_id}/variants")
def add_variant(
    product_id: int,
    body: VariantCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    variant = ProductVariant(
        product_id=product_id,
        color=body.color,
        size=body.size,
        stock=body.stock,
        images=body.images,      # stored as JSON list in DB
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


@router.put("/variants/{variant_id}")
def update_variant(
    variant_id: int,
    body: VariantUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    variant = db.query(ProductVariant).filter(ProductVariant.variant_id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    if body.color is not None: variant.color = body.color
    if body.size is not None: variant.size = body.size
    if body.stock is not None: variant.stock = body.stock
    if body.images is not None: variant.images = body.images
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