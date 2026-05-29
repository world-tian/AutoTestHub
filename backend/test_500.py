import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models.domain import ExecutionResult, TestCase

db = SessionLocal()
try:
    results = db.query(ExecutionResult).filter(ExecutionResult.run_id == "869b95d9-ce05-45ab-9ae8-46a845299837").all()
    print("Found results:", len(results))
    for r in results:
        print(r.id, r.run_id, r.test_case_id, r.status, r.error_message, getattr(r, 'log_url', None), getattr(r, 'executed_at', None))
except Exception as e:
    import traceback
    traceback.print_exc()
