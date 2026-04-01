from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_admin_user
from app.models.category import Category
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate, CategoryWithChildren
from typing import List

router = APIRouter(prefix="/api/categories", tags=["Categories"])

@router.get("/", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    """Get all standalone categories from database."""
    return db.query(Category).order_by(Category.name.asc()).all()

@router.get("/with-children", response_model=List[CategoryWithChildren])
def get_categories_with_children(db: Session = Depends(get_db)):
    """Backwards-compatible endpoint in standalone mode (no nested hierarchy)."""
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return [{"id": c.id, "name": c.name, "created_at": c.created_at, "children": []} for c in categories]

@router.get("/{category_id}", response_model=CategoryOut)
def get_category(category_id: int, db: Session = Depends(get_db)):
    """Get a specific category by ID"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@router.post("/", response_model=CategoryOut)
def create_category(category: CategoryCreate, db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    """Create a new standalone category (admin only)."""
    normalized_name = category.name.strip()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Category name is required")

    db_cat = db.query(Category).filter(Category.name.ilike(normalized_name)).first()
    if db_cat:
        raise HTTPException(status_code=400, detail="Category already exists")

    new_cat = Category(name=normalized_name, parent_id=None)
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int, 
    category: CategoryUpdate, 
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user)
):
    """Update a standalone category name (admin only)."""
    db_cat = db.query(Category).filter(Category.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if category.name:
        normalized_name = category.name.strip()
        if not normalized_name:
            raise HTTPException(status_code=400, detail="Category name is required")
        # Check if name already exists for another category
        existing = db.query(Category).filter(
            Category.name.ilike(normalized_name),
            Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Category name already exists")
        db_cat.name = normalized_name
    
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    """Delete a category (admin only) without cascading to unrelated categories."""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Flatten any legacy children to standalone categories before deletion.
    db.query(Category).filter(Category.parent_id == category_id).update({Category.parent_id: None})
    
    db.delete(cat)
    db.commit()
    return {"message": "Category deleted"}
