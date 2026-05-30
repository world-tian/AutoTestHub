file_path = "/Users/bytedance/Documents/AutoTestHub/backend/app/api/endpoints.py"
with open(file_path, 'r') as f:
    content = f.read()

old_import = "from app.models.domain import User, Project, Requirement, TestCase, ExecutionRun, ExecutionResult, Config, ScheduledTask, TestPlan"
new_import = "from app.models.domain import *"

content = content.replace(old_import, new_import)

with open(file_path, 'w') as f:
    f.write(content)
