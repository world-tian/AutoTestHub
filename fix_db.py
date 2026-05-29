import sqlite3

conn = sqlite3.connect('/Users/bytedance/Documents/AutoTestHub/backend/autotesthub.db')
cursor = conn.cursor()

try:
    cursor.execute('ALTER TABLE execution_runs ADD COLUMN logs_zip_url TEXT;')
    print("Added logs_zip_url to execution_runs")
except Exception as e:
    print(f"Error adding logs_zip_url: {e}")

try:
    cursor.execute('ALTER TABLE execution_runs ADD COLUMN report_url TEXT;')
    print("Added report_url to execution_runs")
except Exception as e:
    print(f"Error adding report_url: {e}")

conn.commit()
conn.close()
