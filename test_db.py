import sqlite3
import json

conn = sqlite3.connect('/Users/bytedance/Documents/AutoTestHub/backend/autotesthub.db')
cursor = conn.cursor()

cursor.execute('SELECT log_url FROM execution_case_results WHERE run_id="2ff533ae-6fd3-48b6-99ed-51bbc5aebb1c";')
result = cursor.fetchone()
print(f"Log URL: {result[0][:100] if result and result[0] else 'None'}")

conn.close()
