import sqlite3

conn = sqlite3.connect('/Users/bytedance/Documents/AutoTestHub/backend/autotesthub.db')
cursor = conn.cursor()

try:
    cursor.execute('ALTER TABLE execution_case_results ADD COLUMN start_time TEXT;')
    print("Added start_time to execution_case_results")
except Exception as e:
    print(f"Error adding start_time: {e}")

try:
    cursor.execute('ALTER TABLE execution_case_results ADD COLUMN end_time TEXT;')
    print("Added end_time to execution_case_results")
except Exception as e:
    print(f"Error adding end_time: {e}")

conn.commit()
conn.close()
