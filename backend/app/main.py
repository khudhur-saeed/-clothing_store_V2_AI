from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models  # registers all models with SQLAlchemy
from app.routers import auth, products, cart, orders, addresses, favorites, reviews, variants, coupons, categories, ai, outfits, shipping, conversations


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: rebuild Elasticsearch index and sync all active products."""
    try:
        from app.core.search import es, _is_es_available, INDEX_NAME
        from app.database import SessionLocal
        from app.models.product import Product

        if _is_es_available():
            # Recreate index with 0 replicas (single-node safe → cluster stays green)
            if es.indices.exists(index=INDEX_NAME):
                es.indices.delete(index=INDEX_NAME)

            mapping = {
                "properties": {
                    "product_id": {"type": "integer"},
                    "name":        {"type": "text"},
                    "description": {"type": "text"},
                    "category":    {"type": "text"},
                    "status":      {"type": "keyword"},
                    "department":  {"type": "keyword"},
                    "outfit_slot": {"type": "keyword"},
                    "price":       {"type": "float"},
                }
            }
            es.indices.create(
                index=INDEX_NAME,
                settings={"number_of_shards": 1, "number_of_replicas": 0},
                mappings=mapping,
            )

            # Bulk-index all active products
            db = SessionLocal()
            try:
                active_products = db.query(Product).filter(Product.status == "active").all()
                for p in active_products:
                    doc = {
                        "product_id": p.product_id,
                        "name":        p.name,
                        "description": p.description,
                        "category":    p.category,
                        "price":       float(p.price) if p.price else None,
                        "status":      p.status,
                        "department":  p.department.value if p.department else None,
                        "outfit_slot": p.piece_type.value if p.piece_type else None,
                    }
                    es.index(index=INDEX_NAME, id=p.product_id, document=doc)
                es.indices.refresh(index=INDEX_NAME)
                print(f"✅ Elasticsearch: indexed {len(active_products)} products (cluster: {es.cluster.health()['status']})")
            finally:
                db.close()
        else:
            print("⚠️  Elasticsearch not reachable at startup — chatbot will use DB fallback.")
    except Exception as exc:
        print(f"⚠️  Elasticsearch startup sync failed: {exc}")

    yield  # app runs here


app = FastAPI(title="Moda Clothing Store API", version="1.0.0", lifespan=lifespan)

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
