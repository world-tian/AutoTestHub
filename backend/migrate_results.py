import sqlite3

DB_PATH = "/Users/bytedance/Documents/AutoTestHub/backend/autotesthub.db"
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

def add_column(table, column, col_type):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        print(f"✅ Successfully added {column} to {table}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print(f"ℹ️ Column {column} already exists in {table}")
        else:
            print(f"❌ Error adding {column} to {table}: {e}")

add_column("execution_case_results", "duration_ms", "INTEGER")

conn.commit()
conn.close()
print("Migration completed.")
