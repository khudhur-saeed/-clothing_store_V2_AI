from app.core.search import search_products, index_product, delete_product as es_delete_product
from fastapi import HTTPException, APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, List, Dict, Any
from app.dependencies import get_db, get_admin_user
from app.models.product import Product, DepartmentEnum, OutfitSlotEnum
from app.models.category import Category
from app.models.product_variant import ProductVariant
from app.models.order import Order, OrderItem
from app.models.cart import ShoppingCart
from app.models.outfit import OutfitProduct
from app.models.favorite import Favorite
from app.models.review import Review
from app.schemas.product import AdminProductCreate, AdminProductUpdate

router = APIRouter(prefix="/api/products", tags=["Products"])

TERMINAL_ORDER_STATUSES = {"delivered", "cancelled"}


def parse_department(value: str) -> DepartmentEnum:
    # UI alias: Kids maps to Unisex for storage.
    if value == "Kids":
        return DepartmentEnum.Unisex

    try:
        return DepartmentEnum[value]
    except KeyError:
        valid = [d.name for d in DepartmentEnum] + ["Kids"]
        raise HTTPException(status_code=400, detail=f"Invalid department. Must be one of: {valid}")


def get_department_filter_values(value: str) -> List[DepartmentEnum]:
    # Customer-facing Kids filter should include all kids-oriented departments.
    if value == "Kids":
        return [DepartmentEnum.Boys, DepartmentEnum.Girls, DepartmentEnum.Unisex]

    try:
        return [DepartmentEnum[value]]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid department: {value}")


def parse_piece_type(value: str) -> OutfitSlotEnum:
    normalized = (value or "").strip()
    for slot in OutfitSlotEnum:
        if slot.name.lower() == normalized.lower() or slot.value.lower() == normalized.lower():
            return slot
    valid = [s.value for s in OutfitSlotEnum]
    raise HTTPException(status_code=400, detail=f"Invalid piece type. Must be one of: {valid}")


def get_category_or_400(db: Session, category_id: int) -> Category:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail=f"Category {category_id} not found")
    return category


def serialize_product(product: Product) -> Dict[str, Any]:
    piece_type = product.piece_type.value if isinstance(product.piece_type, OutfitSlotEnum) else str(product.piece_type)
    department = product.department.value if isinstance(product.department, DepartmentEnum) else product.department
    category_name = product.category_rel.name if getattr(product, "category_rel", None) else product.category

    return {
        "product_id": product.product_id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "status": product.status,
        "category_id": product.category_id,
        "category": category_name,
        "piece_type": piece_type,
        # Backward-compatible alias for existing consumers.
        "outfit_slot": piece_type,
        "department": department,
        "target_group": product.target_group,
    }


@router.get("/admin/all")
def get_all_products_admin(
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    """Get all products (including inactive) - ADMIN ONLY"""
    return [serialize_product(p) for p in db.query(Product).all()]


@router.get("/")
def get_products(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    target_group: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    piece_type: Optional[str] = Query(None),
    clothing_type: Optional[str] = Query(None),
    outfit_slot: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(Product)
    
    # Only show active products to customers
    q = q.filter(Product.status == 'active')
    
    if search:
        # --- NEW: ELASTICSEARCH ---
        matched_ids = search_products(search)
        if not matched_ids:
            return []  # Elasticsearch found nothing!
        
        # Tell PostgreSQL to only return the products Elasticsearch found
        q = q.filter(Product.product_id.in_(matched_ids))
        # --------------------------
    if category_id is not None:
        q = q.filter(Product.category_id == category_id)
    # Support legacy category parameter
    elif category:
        q = q.filter(Product.category == category)
    # Support legacy target_group parameter
    if target_group:
        q = q.filter(Product.target_group == target_group)
    # New tier 1: Department
    if department:
        dept_values = get_department_filter_values(department)
        if len(dept_values) == 1:
            q = q.filter(Product.department == dept_values[0])
        else:
            q = q.filter(Product.department.in_(dept_values))
    # New tier 2: Outfit Slot
    slot_filter = piece_type or clothing_type or outfit_slot
    if slot_filter:
        q = q.filter(Product.piece_type == parse_piece_type(slot_filter))
    
    if min_price is not None:
        q = q.filter(Product.price >= min_price)
    if max_price is not None:
        q = q.filter(Product.price <= max_price)
    
    return [serialize_product(p) for p in q.all()]


@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Only show active products to customers
    if product.status != 'active':
        raise HTTPException(status_code=404, detail="Product not found")
    return serialize_product(product)


@router.post("/")
def create_product(
    payload: AdminProductCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    category = get_category_or_400(db, payload.category_id)
    slot_enum = parse_piece_type(payload.piece_type)
    
    product = Product(
        name=payload.name,
        price=payload.price,
        description=payload.description,
        category=category.name,
        category_id=category.id,
        status=payload.status,
        department=DepartmentEnum.Unisex,
        piece_type=slot_enum
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    index_product(product)  # Sync to Elasticsearch!
    return serialize_product(product)


@router.put("/{product_id}")
def update_product(
    product_id: int,
    payload: AdminProductUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Prevent activating a product that has no variants or variants without images
    if payload.status == "active":
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

    if payload.name is not None:
        product.name = payload.name
    if payload.price is not None:
        product.price = payload.price
    if payload.description is not None:
        product.description = payload.description
    if payload.category_id is not None:
        category = get_category_or_400(db, payload.category_id)
        product.category_id = category.id
        product.category = category.name
    if payload.piece_type is not None:
        product.piece_type = parse_piece_type(payload.piece_type)
    if payload.status is not None:
        product.status = payload.status
    
    db.commit()
    db.refresh(product)
    index_product(product)  # Sync the updates to Elasticsearch!
    return serialize_product(product)


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    variant_ids = [v.variant_id for v in db.query(ProductVariant.variant_id).filter(ProductVariant.product_id == product_id).all()]

    if variant_ids:
        blocking_orders = (
            db.query(Order.orderid, Order.status)
            .select_from(OrderItem)
            .join(Order, Order.orderid == OrderItem.orderid)
            .filter(OrderItem.variant_id.in_(variant_ids))
            .filter(or_(Order.status.is_(None), ~Order.status.in_(TERMINAL_ORDER_STATUSES)))
            .distinct()
            .order_by(Order.orderid.desc())
            .all()
        )
        if blocking_orders:
            shown_orders = blocking_orders[:5]
            orders_summary = ", ".join([f"#{oid} ({status or 'processing'})" for oid, status in shown_orders])
            if len(blocking_orders) > 5:
                orders_summary += f", +{len(blocking_orders) - 5} more"

            raise HTTPException(
                status_code=409,
                detail=(
                    "Cannot delete this product because it is linked to non-final orders. "
                    f"Blocking orders: {orders_summary}. Set it to inactive instead."
                )
            )

        # If all linked orders are terminal (delivered/cancelled), detach historical links and allow deletion.
        db.query(OrderItem).filter(OrderItem.variant_id.in_(variant_ids)).delete(synchronize_session=False)

        db.query(ShoppingCart).filter(ShoppingCart.variant_id.in_(variant_ids)).delete(synchronize_session=False)
        db.query(OutfitProduct).filter(OutfitProduct.variant_id.in_(variant_ids)).delete(synchronize_session=False)
        db.query(ProductVariant).filter(ProductVariant.product_id == product_id).delete(synchronize_session=False)

    db.query(Favorite).filter(Favorite.product_id == product_id).delete(synchronize_session=False)
    db.query(Review).filter(Review.product_id == product_id).delete(synchronize_session=False)

    db.delete(product)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete this product because it is referenced by other records. Set it to inactive instead."
        )
    es_delete_product(product_id)  # Remove from Elasticsearch!
    return {"message": "Product deleted"}