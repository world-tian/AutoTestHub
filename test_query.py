import sys
import os

# 动态获取脚本所在目录并拼接 backend 路径，以适配 Windows 和 macOS 等不同环境
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")
sys.path.append(backend_dir)
# 动态切换工作目录到 backend 下，确保 SQLite 相对路径能正确解析数据库文件
os.chdir(backend_dir)
# pyrefly: ignore [missing-import]
from app.database import SessionLocal
# pyrefly: ignore [missing-import]
from app.models.domain import ExecutionRun
# pyrefly: ignore [missing-import]
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
