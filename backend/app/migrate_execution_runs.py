import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), '../autotesthub.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE execution_runs ADD COLUMN test_plan_id VARCHAR;")
        print("added test_plan_id")
    except Exception as e:
        print(f"error test_plan_id: {e}")
        
    try:
        cursor.execute("ALTER TABLE execution_runs ADD COLUMN agent_id VARCHAR;")
        print("added agent_id")
    except Exception as e:
        print(f"error agent_id: {e}")
        
    try:
        cursor.execute("ALTER TABLE execution_runs ADD COLUMN device_id VARCHAR;")
        print("added device_id")
    except Exception as e:
        print(f"error device_id: {e}")
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
