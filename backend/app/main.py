from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models  # registers all models with SQLAlchemy
from app.routers import auth, products

app = FastAPI(title="Moda Clothing Store API", version="1.0.0")

# Allow the React frontend (port 5173) to call this backend (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)

@app.get("/")
def root():
    return {"message": "Moda Clothing Store API is running 🚀"}
