from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_admin_user
from app.models.user import User
from app.models.order import Order

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/")
def get_all_users(db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    users = db.query(User).order_by(User.user_id.desc()).all()
    result = []
    for u in users:
        order_count = db.query(Order).filter(Order.user_id == u.user_id).count()
        result.append({
            "user_id":    u.user_id,
            "first_name": u.first_name,
            "last_name":  u.last_name,
            "email":      u.email,
            "phone_no":   u.phone_no or "",
            "role":       u.role or "customer",
            "order_count": order_count,
        })
    return result
