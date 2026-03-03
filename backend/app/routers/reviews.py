from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from app.dependencies import get_db, get_current_user
from app.models.review import Review

router = APIRouter(prefix="/api/products", tags=["Reviews"])


@router.get("/{product_id}/reviews")
def get_reviews(product_id: int, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.product_id == product_id).all()


@router.post("/{product_id}/reviews")
def add_review(
    product_id: int,
    rating: int,
    comment: str = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    review = Review(
        user_id=current_user.user_id,
        product_id=product_id,
        rating=rating,
        comment=comment,
        review_date=date.today()
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.delete("/reviews/{review_id}")
def delete_review(
    review_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(
        Review.reviewid == review_id,
        Review.user_id == current_user.user_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return {"message": "Review deleted"}
