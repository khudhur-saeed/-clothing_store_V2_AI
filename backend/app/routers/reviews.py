from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from pydantic import BaseModel
from app.dependencies import get_db, get_current_user
from app.models.review import Review
from app.models.product import Product
from app.models.user import User

router = APIRouter(prefix="/api/products", tags=["Reviews"])


class ReviewCreatePayload(BaseModel):
    rating: int
    comment: Optional[str] = None


@router.get("/{product_id}/reviews")
def get_reviews(product_id: int, db: Session = Depends(get_db)):
    # Check if product exists and is active
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.status != 'active':
        raise HTTPException(status_code=404, detail="Product not found")
    
    rows = (
        db.query(Review, User.first_name, User.last_name)
        .join(User, User.user_id == Review.user_id)
        .filter(Review.product_id == product_id)
        .order_by(Review.review_date.desc())
        .all()
    )

    result = []
    for review, first_name, last_name in rows:
        full_name = f"{(first_name or '').strip()} {(last_name or '').strip()}".strip()
        result.append({
            "reviewid": review.reviewid,
            "user_id": review.user_id,
            "product_id": review.product_id,
            "comment": review.comment,
            "rating": review.rating,
            "review_date": review.review_date,
            "user_name": full_name or f"User {review.user_id}",
        })

    return result


@router.post("/{product_id}/reviews")
def add_review(
    product_id: int,
    payload: Optional[ReviewCreatePayload] = Body(default=None),
    rating: Optional[int] = Query(default=None),
    comment: Optional[str] = Query(default=None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if product exists and is active
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.status != 'active':
        raise HTTPException(status_code=404, detail="Product not found")
    
    final_rating = payload.rating if payload is not None else rating
    final_comment = payload.comment if payload is not None else comment

    if final_rating is None:
        raise HTTPException(status_code=422, detail="rating is required")

    if final_rating < 1 or final_rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    review = Review(
        user_id=current_user.user_id,
        product_id=product_id,
        rating=final_rating,
        comment=final_comment,
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
