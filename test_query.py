import sys
import os

sys.path.append("/Users/bytedance/Documents/AutoTestHub/backend")
from app.database import SessionLocal
from app.models.domain import ExecutionRun
from app.schemas.domain import ExecutionRunResponse

db = SessionLocal()
try:
    runs = db.query(ExecutionRun).filter(ExecutionRun.project_id == "59adcd06-9c9f-4f44-a59c-4d104f9f9a32").all()
    print(f"Found {len(runs)} runs")
    for r in runs:
        try:
            resp = ExecutionRunResponse.model_validate(r)
            print(f"Success for {r.id}")
        except Exception as e:
            print(f"Error for {r.id}: {e}")
finally:
    db.close()
