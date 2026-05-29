import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), '../autotesthub.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE projects ADD COLUMN working_dir VARCHAR;")
        cursor.execute("ALTER TABLE projects ADD COLUMN test_command VARCHAR;")
        print("projects table updated.")
    except Exception as e:
        print(f"projects error: {e}")
        
    try:
        cursor.execute("ALTER TABLE test_plans ADD COLUMN working_dir VARCHAR;")
        cursor.execute("ALTER TABLE test_plans ADD COLUMN test_command VARCHAR;")
        print("test_plans table updated.")
    except Exception as e:
        print(f"test_plans error: {e}")
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
