from app.database import SessionLocal
from app.api.endpoints import trigger_execution_internal

db = SessionLocal()
try:
    trigger_execution_internal(db, "59adcd06-9c9f-4f44-a59c-4d104f9f9a32", "test_run")
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
