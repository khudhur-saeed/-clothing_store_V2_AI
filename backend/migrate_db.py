#!/usr/bin/env python3
"""
Database migration script to rename department column to category_id
"""
from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def main():
    engine = create_engine(settings.DATABASE_URL)
    
    # Check current state
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('outfit')]
    
    print(f"Current columns: {columns}")
    
    with engine.connect() as conn:
        try:
            if 'department' in columns and 'category_id' not in columns:
                print("Renaming 'department' to 'category_id'...")
                conn.execute(text("ALTER TABLE outfit RENAME COLUMN department TO category_id;"))
                conn.commit()
                print("✅ Migration successful!")
            elif 'category_id' in columns:
                print("✅ Column 'category_id' already exists - no migration needed")
            else:
                print("❌ Error: 'department' column not found")
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()

if __name__ == "__main__":
    main()
