from app.database import engine
from app.models.domain import Base

Base.metadata.create_all(bind=engine)
print("Missing tables created successfully.")
