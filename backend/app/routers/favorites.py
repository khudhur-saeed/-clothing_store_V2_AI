from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.favorite import Favorite

router = APIRouter(prefix="/api/favorites", tags=["Favorites"])


@router.get("/")
def get_favorites(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Favorite).filter(Favorite.user_id == current_user.user_id).all()


@router.post("/{product_id}")
def add_favorite(
    product_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.user_id,
        Favorite.product_id == product_id
    ).first()
    if existing:
        return {"message": "Already in favorites"}
    fav = Favorite(user_id=current_user.user_id, product_id=product_id)
    db.add(fav)
    db.commit()
    return {"message": "Added to favorites"}


@router.delete("/{product_id}")
def remove_favorite(
    product_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fav = db.query(Favorite).filter(
        Favorite.user_id == current_user.user_id,
        Favorite.product_id == product_id
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Not in favorites")
    db.delete(fav)
    db.commit()
    return {"message": "Removed from favorites"}
