from app.database import SessionLocal, Base, engine
# 导入所有模型以确保它们在 metadata 中注册
from app.models.domain import User, Project, Requirement, TestCase, ExecutionRun, ExecutionResult, Config, ScheduledTask
from app.models.device import Device, DevicePool, Agent, ExecutionQueue
from app.core.security import get_password_hash

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Create default admin
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("AutoTestHub@123"),
            is_superuser=True
        )
        db.add(admin)
        db.commit()
    
    db.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized with default admin.")
