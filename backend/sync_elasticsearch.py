import sys
import os

# This lets Python find our 'app' package from the backend folder
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.product import Product
from app.core.search import index_product, create_index

def sync_all_products():
    db = SessionLocal()
    
    try:
        # Step 1: Recreate the index fresh (clean slate)
        print("Creating Elasticsearch index...")
        create_index()

        # Step 2: Fetch ALL products from PostgreSQL
        products = db.query(Product).all()
        print(f"Found {len(products)} products in the database.")

        # Step 3: Loop through each product and send it to Elasticsearch
        count = 0
        for product in products:
            index_product(product)
            count += 1
            print(f"  Indexed: [{product.product_id}] {product.name}")

        print(f"\n✅ Done! {count} products synced to Elasticsearch.")

    finally:
        db.close()

if __name__ == "__main__":
    sync_all_products()
