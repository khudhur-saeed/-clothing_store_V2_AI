#!/bin/bash
cd /home/taysiir/Epart/bitirme/clothing-store/-clothing_store_V2_AI/backend
python3 << 'MIGRATION_EOF'
from sqlalchemy import text, create_engine
from app.core.config import settings

try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE outfit RENAME COLUMN department TO category_id;'))
        conn.commit()
except Exception as e:
    pass
MIGRATION_EOF
echo "" > /dev/null
