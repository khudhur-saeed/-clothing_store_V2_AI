"""
Diagnostic script — run with:
    cd backend && python test_product_search.py
"""
import os, sys
from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import or_
from app.database import SessionLocal
from app.models.product import Product
from app.models.product_variant import ProductVariant

db = SessionLocal()

try:
    # ── 1. What distinct colors exist in the DB? ──────────────────────────────
    print("\n=== DISTINCT VARIANT COLORS IN DB ===")
    colors = db.query(ProductVariant.color).distinct().all()
    for row in colors:
        print(f"  {row[0]!r}")

    # ── 2. How many active products exist? ────────────────────────────────────
    total = db.query(Product).filter(Product.status == "active").count()
    print(f"\n=== ACTIVE PRODUCTS: {total} ===")

    # ── 3. Sample 5 product names ─────────────────────────────────────────────
    print("\n=== SAMPLE PRODUCT NAMES ===")
    for p in db.query(Product).filter(Product.status == "active").limit(5).all():
        print(f"  id={p.product_id} | {p.name!r}")

    # ── 4. Direct color search: "mavi" ────────────────────────────────────────
    print("\n=== SEARCH color ILIKE '%mavi%' ===")
    results = (
        db.query(Product)
        .join(ProductVariant, ProductVariant.product_id == Product.product_id)
        .filter(Product.status == "active")
        .filter(ProductVariant.color.ilike("%mavi%"))
        .distinct()
        .limit(5)
        .all()
    )
    for p in results:
        print(f"  {p.name!r}")
    if not results:
        print("  (none found)")

    # ── 5. Direct color search: "beyaz" ───────────────────────────────────────
    print("\n=== SEARCH color ILIKE '%beyaz%' ===")
    results = (
        db.query(Product)
        .join(ProductVariant, ProductVariant.product_id == Product.product_id)
        .filter(Product.status == "active")
        .filter(ProductVariant.color.ilike("%beyaz%"))
        .distinct()
        .limit(5)
        .all()
    )
    for p in results:
        print(f"  {p.name!r}")
    if not results:
        print("  (none found)")

    # ── 6. Name search: "shirt" OR "tshirt" OR "tişört" ──────────────────────
    print("\n=== SEARCH name ILIKE '%shirt%' OR '%tişört%' ===")
    results = (
        db.query(Product)
        .filter(Product.status == "active")
        .filter(or_(
            Product.name.ilike("%shirt%"),
            Product.name.ilike("%tişört%"),
            Product.name.ilike("%tisort%"),
        ))
        .limit(5)
        .all()
    )
    for p in results:
        print(f"  id={p.product_id} | {p.name!r}")
    if not results:
        print("  (none found)")

    # ── 7. Combined: shirt + mavi ─────────────────────────────────────────────
    print("\n=== COMBINED: (shirt OR tişört) AND (mavi OR blue) ===")
    results = (
        db.query(Product)
        .join(ProductVariant, ProductVariant.product_id == Product.product_id)
        .filter(Product.status == "active")
        .filter(or_(
            Product.name.ilike("%shirt%"),
            Product.name.ilike("%tişört%"),
        ))
        .filter(or_(
            ProductVariant.color.ilike("%mavi%"),
            ProductVariant.color.ilike("%blue%"),
        ))
        .distinct()
        .limit(5)
        .all()
    )
    for p in results:
        print(f"  {p.name!r}")
    if not results:
        print("  (none found)")

    # ── 8. Test _find_products directly ──────────────────────────────────────
    print("\n=== TESTING _find_products('blue t shirt') ===")
    from app.routers.ai import _find_products
    products, cf = _find_products(db, "blue t shirt", limit=4)
    print(f"color_filter={cf}")
    print(f"products found: {len(products)}")
    for p in products:
        print(f"  {p.name!r}")

    print("\n=== TESTING _find_products('beyaz t shirt') ===")
    products, cf = _find_products(db, "beyaz t shirt", limit=4)
    print(f"color_filter={cf}")
    print(f"products found: {len(products)}")
    for p in products:
        print(f"  {p.name!r}")

finally:
    db.close()
