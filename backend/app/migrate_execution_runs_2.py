import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), '../autotesthub.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    columns = [
        "logs_zip_url VARCHAR",
        "report_url VARCHAR",
        "summary JSON",
        "started_at DATETIME",
        "ended_at DATETIME"
    ]
    for col in columns:
        try:
            cursor.execute(f"ALTER TABLE execution_runs ADD COLUMN {col};")
            print(f"added {col}")
        except Exception as e:
            print(f"error {col}: {e}")
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
