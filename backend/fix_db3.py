import sqlite3

conn = sqlite3.connect('backend/autotesthub.db')
cursor = conn.cursor()

try:
    cursor.execute('ALTER TABLE execution_case_results ADD COLUMN artifacts TEXT')
    print("Added artifacts column")
except sqlite3.OperationalError as e:
    print(f"artifacts error: {e}")

try:
    cursor.execute('ALTER TABLE execution_case_results ADD COLUMN html_report TEXT')
    print("Added html_report column")
except sqlite3.OperationalError as e:
    print(f"html_report error: {e}")

conn.commit()
conn.close()
