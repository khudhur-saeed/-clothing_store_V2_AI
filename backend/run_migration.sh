#!/bin/bash
cd "/home/khedr/Documents/Bitirme proje/Code/backend"
source venv/bin/activate
python3 << 'MIGRATION_EOF'
from sqlalchemy import text, create_engine
from app.core.config import settings

try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE outfit RENAME COLUMN department TO category_id;'))
        conn.commit()
    print("Migration successful: Renamed department to category_id in outfit table.")
except Exception as e:
    print(f"Migration failed with error: {e}")
MIGRATION_EOF
echo "" > /dev/null
