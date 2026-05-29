import sqlite3

conn = sqlite3.connect('/Users/bytedance/Documents/AutoTestHub/backend/autotesthub.db')
cursor = conn.cursor()

try:
    cursor.execute('UPDATE execution_case_results SET log_url = (SELECT result FROM execution_queue WHERE run_id = execution_case_results.run_id) WHERE status = "pending" OR status = "running";')
    print("Updated log_url in execution_case_results for pending/running cases")
except Exception as e:
    print(f"Error updating log_url: {e}")

conn.commit()
conn.close()
