from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, get_optional_current_user
from app.models.outfit import Outfit, OutfitProduct
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.user import User
from app.schemas.outfit import OutfitCreate, OutfitUpdate

router = APIRouter(prefix="/api/outfits", tags=["Outfits"])


def serialize_outfit(db: Session, outfit: Outfit, include_creator: bool = False) -> dict:
    from app.models.category import Category
    
    # Get outfit products and fetch their associated product_ids from variants
    outfit_products = db.query(OutfitProduct).filter(OutfitProduct.outfit_id == outfit.outfit_id).all()
    
    # Convert variant_ids to product_ids by querying ProductVariant table
    product_ids = []
    for op in outfit_products:
        variant = db.query(ProductVariant).filter(ProductVariant.variant_id == op.variant_id).first()
        if variant:
            product_ids.append(variant.product_id)
    
    item_ids = product_ids  # Frontend expects product_ids, not variant_ids

    # Get category name if category_id exists
    category_name = None
    if outfit.category_id:
        category = db.query(Category).filter(Category.id == outfit.category_id).first()
        category_name = category.name if category else None

    data = {
        "id": outfit.outfit_id,
        "userId": outfit.user_id,
        "items": item_ids,
        "isPublic": outfit.visibility == "public",
        "createdAt": outfit.created_at,
        "outfit_id": outfit.outfit_id,
        "user_id": outfit.user_id,
        "name": outfit.name,
        "description": outfit.description,
        "visibility": outfit.visibility,
        "category_id": outfit.category_id,
        "category_name": category_name or "UNSPECIFIED",
        "products": item_ids,
        "created_at": outfit.created_at,
        "updated_at": outfit.updated_at,
        "likes": 0,
        "generated_image_url": outfit.generated_image_url or None,
    }

    if include_creator:
        creator = db.query(User).filter(User.user_id == outfit.user_id).first()
        if creator:
            data["creator"] = {
                "user_id": creator.user_id,
                "name": f"{creator.first_name} {creator.last_name}".strip(),
            }

    return data


@router.get("/")
def get_outfits(
    type: Literal["my", "public"] = Query("my"),
    db: Session = Depends(get_db),
    user=Depends(get_optional_current_user),
):
    """List outfits by type: my (auth required) or public (open)."""
    if type == "my":
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        outfits = (
            db.query(Outfit)
            .filter(Outfit.user_id == user.user_id)
            .order_by(Outfit.created_at.desc())
            .all()
        )
        return [serialize_outfit(db, outfit) for outfit in outfits]

    outfits = (
        db.query(Outfit)
        .filter(Outfit.visibility == "public")
        .order_by(Outfit.created_at.desc())
        .all()
    )
    return [serialize_outfit(db, outfit, include_creator=True) for outfit in outfits]


@router.get("/public")
def get_public_outfits(db: Session = Depends(get_db)):
    """Backwards-compatible public outfits endpoint."""
    outfits = (
        db.query(Outfit)
        .filter(Outfit.visibility == "public")
        .order_by(Outfit.created_at.desc())
        .all()
    )
    return [serialize_outfit(db, outfit, include_creator=True) for outfit in outfits]


@router.get("/{outfit_id}")
def get_outfit(
    outfit_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_optional_current_user),
):
    outfit = db.query(Outfit).filter(Outfit.outfit_id == outfit_id).first()

    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    if outfit.visibility != "public":
        if not user or outfit.user_id != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this outfit")

    return serialize_outfit(db, outfit, include_creator=True)


@router.post("/")
def create_outfit(
    outfit_data: OutfitCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    from app.models.product_variant import ProductVariant

    print(f"✨ CREATE outfit: {outfit_data}")

    if not outfit_data.name or not outfit_data.name.strip():
        raise HTTPException(status_code=400, detail="Outfit name is required")

    if outfit_data.visibility not in ["public", "private"]:
        raise HTTPException(status_code=400, detail="Visibility must be 'public' or 'private'")

    # Validate products and collect valid variant IDs
    variant_ids = []
    invalid_pids = []
    
    for pid in outfit_data.product_ids:
        product = db.query(Product).filter(Product.product_id == pid).first()
        if not product:
            print(f"   ⚠️  Product {pid} not found, skipping")
            invalid_pids.append(pid)
            continue
        
        # Get the first variant for this product
        variant = db.query(ProductVariant).filter(ProductVariant.product_id == pid).first()
        if not variant:
            print(f"   ⚠️  Product {pid} has no variants, skipping")
            invalid_pids.append(pid)
            continue
        
        variant_ids.append(variant.variant_id)

    if invalid_pids:
        print(f"   ⚠️  Skipped {len(invalid_pids)} invalid products: {invalid_pids}")

    outfit = Outfit(
        user_id=user.user_id,
        name=outfit_data.name.strip(),
        description=outfit_data.description,
        visibility=outfit_data.visibility,
        category_id=outfit_data.category_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(outfit)
    db.commit()
    db.refresh(outfit)

    for variant_id in variant_ids:
        outfit_product = OutfitProduct(
            outfit_id=outfit.outfit_id,
            variant_id=variant_id,
        )
        db.add(outfit_product)

    db.commit()

    payload = serialize_outfit(db, outfit)
    payload["message"] = "Outfit saved successfully!"
    print(f"   ✅ Outfit created with {len(variant_ids)} valid products")
    return payload


@router.put("/{outfit_id}")
def update_outfit(
    outfit_id: int,
    outfit_data: OutfitUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    from app.models.product_variant import ProductVariant

    print(f"🔄 UPDATE outfit {outfit_id}: {outfit_data}")

    outfit = db.query(Outfit).filter(Outfit.outfit_id == outfit_id).first()

    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    if outfit.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this outfit")

    if outfit_data.name:
        outfit.name = outfit_data.name.strip()
    if outfit_data.description is not None:
        outfit.description = outfit_data.description
    if outfit_data.visibility:
        if outfit_data.visibility not in ["public", "private"]:
            raise HTTPException(status_code=400, detail="Visibility must be 'public' or 'private'")
        outfit.visibility = outfit_data.visibility
    if outfit_data.category_id is not None:
        outfit.category_id = outfit_data.category_id

    outfit.updated_at = datetime.utcnow()

    if outfit_data.product_ids is not None:
        print(f"   Product IDs received: {outfit_data.product_ids}")
        # Validate products and collect valid variant IDs
        variant_ids = []
        invalid_pids = []
        
        for pid in outfit_data.product_ids:
            product = db.query(Product).filter(Product.product_id == pid).first()
            if not product:
                print(f"   ⚠️  Product {pid} not found, skipping")
                invalid_pids.append(pid)
                continue
            
            # Get the first variant for this product
            variant = db.query(ProductVariant).filter(ProductVariant.product_id == pid).first()
            if not variant:
                print(f"   ⚠️  Product {pid} has no variants, skipping")
                invalid_pids.append(pid)
                continue
            
            variant_ids.append(variant.variant_id)

        if invalid_pids:
            print(f"   ⚠️  Skipped {len(invalid_pids)} invalid products: {invalid_pids}")

        # Clear existing outfit products and add valid ones
        db.query(OutfitProduct).filter(OutfitProduct.outfit_id == outfit_id).delete()

        for variant_id in variant_ids:
            outfit_product = OutfitProduct(
                outfit_id=outfit.outfit_id,
                variant_id=variant_id,
            )
            db.add(outfit_product)

    db.commit()
    db.refresh(outfit)

    payload = serialize_outfit(db, outfit)
    payload["message"] = "Outfit updated successfully!"
    print(f"   ✅ Outfit {outfit_id} updated with {len(variant_ids) if outfit_data.product_ids is not None else 'same'} products")
    return payload


@router.delete("/{outfit_id}")
def delete_outfit(
    outfit_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    outfit = db.query(Outfit).filter(Outfit.outfit_id == outfit_id).first()

    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    if outfit.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this outfit")

    db.query(OutfitProduct).filter(OutfitProduct.outfit_id == outfit_id).delete()
    db.delete(outfit)
    db.commit()

    return {"message": "Outfit deleted successfully!"}
