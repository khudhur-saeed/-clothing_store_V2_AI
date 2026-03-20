from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_admin_user
from app.models.category import Category
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/categories", tags=["Categories"])

class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@router.post("/", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    db_cat = db.query(Category).filter(Category.name == category.name).first()
    if db_cat:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    if category.parent_id:
        parent = db.query(Category).filter(Category.id == category.parent_id).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent category not found")

    new_cat = Category(name=category.name, parent_id=category.parent_id)
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    # Delete all subcategories
    db.query(Category).filter(Category.parent_id == category_id).delete()
    
    db.delete(cat)
    db.commit()
    return {"message": "Category deleted"}
