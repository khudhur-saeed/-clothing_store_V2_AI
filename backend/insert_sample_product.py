import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.product import Product, DepartmentEnum, OutfitSlotEnum
from app.models.product_variant import ProductVariant
from app.models.category import Category

def insert_product():
    db = SessionLocal()
    try:
        # Check if we need a category, let's just create a general one or find one
        category = db.query(Category).filter_by(name="T-Shirts").first()
        if not category:
            category = Category(name="T-Shirts")
            db.add(category)
            db.commit()
            db.refresh(category)

        # Create Product
        product = Product(
            name="Grimelange Solo Erkek %100 Organik Pamuklu Kalın Dokulu Comfort Fit Bisiklet Yakalı Siyah T-shirt",
            description="Rahat ve şık bir görünüm için düz tasarımıyla günlük kullanımın vazgeçilmezi; Basic koleksiyonun sadeliği ve konforu, her gardıropta yerini alacak; Bisiklet yaka kesimi ile modern ve rahat bir stil sunar; %100 pamuk materyali sayesinde gün boyu nefes alabilen ve cilt dostu bir deneyim sağlar.",
            price=270.67,
            status="Active",
            department=DepartmentEnum.Men,
            piece_type=OutfitSlotEnum.Tops,
            category_id=category.id,
            category="T-Shirts",
            target_group="Men"
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        # Create Variants for each size
        sizes = ["XS", "S", "M", "L", "XL", "2XL"]
        for size in sizes:
            variant = ProductVariant(
                product_id=product.product_id,
                color="Black",
                size=size,
                stock=10,
                images=["https://productimages.hepsiburada.net/s/777/424-600/110000902728393.jpg"]
            )
            db.add(variant)
        
        db.commit()
        print(f"Successfully inserted product with ID: {product.product_id}")
    except Exception as e:
        print(f"Error inserting product: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    insert_product()
