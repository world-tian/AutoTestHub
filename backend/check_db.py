from app.database import engine, Base
from app.models.domain import *
import sqlite3

Base.metadata.create_all(bind=engine)
print("Base.metadata.create_all executed successfully.")
