from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session 
from app.dependencies import get_db
from app.models.user import User
from app.core.security import hash_password, verify_password,create_access_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register")
def register(first_name: str,last_name: str, email: str, password: str, db:Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail= "Email already registed")
    
    new_user = User(first_name=first_name, 
        last_name=last_name,
        email=email,
        password=hash_password(password),
        role="customer"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.user_id})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login")
def login(email: str, password: str, db:Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.user_id})
    return {"access_token": token, "token_type": "bearer", "user_id": user.user_id, "role": user.role}