from app.database import engine, SessionLocal
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    try:
        # Check if local_case_id column exists
        result = db.execute(text("PRAGMA table_info(test_cases)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'local_case_id' not in columns:
            db.execute(text("ALTER TABLE test_cases ADD COLUMN local_case_id VARCHAR"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_test_cases_local_case_id ON test_cases(local_case_id)"))
            db.commit()
            print("Added local_case_id column successfully!")
        else:
            print("local_case_id column already exists.")
            
        # Check if log_url column exists in execution_case_results
        result = db.execute(text("PRAGMA table_info(execution_case_results)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'log_url' not in columns:
            db.execute(text("ALTER TABLE execution_case_results ADD COLUMN log_url VARCHAR"))
            db.commit()
            print("Added log_url column successfully!")
        else:
            print("log_url column already exists.")
            
    except Exception as e:
        print(f"Migration error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
