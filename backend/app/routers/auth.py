from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session 
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.user import UserLogin, UserCreate, UserUpdate

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registed")
    
    new_user = User(
        first_name=user_data.first_name, 
        last_name=user_data.last_name,
        email=user_data.email,
        password=hash_password(user_data.password),
        role="customer"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.user_id)})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.user_id)})
    return {"access_token": token, "token_type": "bearer", "user_id": user.user_id, "role": user.role}


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "phone_no": current_user.phone_no,
        "role": current_user.role
    }


@router.put("/me")
def update_me(
    update_data: UserUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if update_data.first_name: current_user.first_name = update_data.first_name
    if update_data.last_name: current_user.last_name = update_data.last_name
    if update_data.phone_no: current_user.phone_no = update_data.phone_no
    if update_data.password:
        current_user.password = hash_password(update_data.password)
    
    db.commit()
    db.refresh(current_user)
    return {
        "user_id": current_user.user_id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "phone_no": current_user.phone_no,
        "role": current_user.role
    }