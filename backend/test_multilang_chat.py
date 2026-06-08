import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup python path to include app
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.routers.ai import chat_with_ai, ChatRequest, ChatMessage

db = SessionLocal()

try:
    # 1. Turkish Test
    request_tr = ChatRequest(
        history=[],
        user_message="tşört var mı?"
    )
    print("Calling chat_with_ai with 'tşört var mı?' (Turkish)...")
    res_tr = chat_with_ai(request=request_tr, db=db, current_user=None)
    print("Turkish Response:")
    print(res_tr["response"])
    print("Returned Products count:", len(res_tr["products"]))

    # 2. Arabic Test
    request_ar = ChatRequest(
        history=[],
        user_message="هل لديكم تي شيرت؟"
    )
    print("\nCalling chat_with_ai with 'هل لديكم تي شيرت؟' (Arabic)...")
    res_ar = chat_with_ai(request=request_ar, db=db, current_user=None)
    print("Arabic Response:")
    print(res_ar["response"])
    print("Returned Products count:", len(res_ar["products"]))

    # 3. Turkish Empty Test
    request_tr_empty = ChatRequest(
        history=[],
        user_message="uzay elbiseniz var mı?"
    )
    print("\nCalling chat_with_ai with 'uzay elbiseniz var mı?' (Turkish empty product)...")
    res_tr_empty = chat_with_ai(request=request_tr_empty, db=db, current_user=None)
    print("Turkish Empty Response:")
    print(res_tr_empty["response"])

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
