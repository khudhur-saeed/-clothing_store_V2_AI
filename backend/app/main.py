from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models  # registers all models with SQLAlchemy
from app.routers import auth, products, cart, orders, addresses, favorites, reviews, variants, coupons, categories, ai, outfits, shipping, conversations

app = FastAPI(title="Moda Clothing Store API", version="1.0.0")

# Allow the React frontend (port 5173 and 5174) to call this backend (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(addresses.router)
app.include_router(favorites.router)
app.include_router(variants.router)
app.include_router(reviews.router)
app.include_router(coupons.router)
app.include_router(categories.router)
app.include_router(ai.router)
app.include_router(outfits.router)
app.include_router(shipping.router)
app.include_router(conversations.router)


@app.get("/")
def root():
    return {"message": "Moda Clothing Store API is running 🚀"}
