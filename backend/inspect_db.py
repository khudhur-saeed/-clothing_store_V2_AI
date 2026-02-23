"""
Run this script to print all table schemas from your database.
Usage: python inspect_db.py
"""
from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

tables = inspector.get_table_names()
print(f"\n{'='*60}")
print(f"Database has {len(tables)} tables: {tables}")
print(f"{'='*60}\n")

for table in sorted(tables):
    print(f"\n--- TABLE: {table} ---")
    columns = inspector.get_columns(table)
    for col in columns:
        nullable = "" if col['nullable'] else " NOT NULL"
        default = f" DEFAULT={col['default']}" if col.get('default') else ""
        print(f"  {col['name']:25} {str(col['type']):30}{nullable}{default}")
    
    pks = inspector.get_pk_constraint(table)
    print(f"  PRIMARY KEY: {pks['constrained_columns']}")
    
    fks = inspector.get_foreign_keys(table)
    for fk in fks:
        print(f"  FK: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")

print("\n✅ Done!")
