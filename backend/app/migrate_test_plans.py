import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), '../autotesthub.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS test_plans (
        id VARCHAR PRIMARY KEY,
        project_id VARCHAR,
        name VARCHAR NOT NULL,
        description TEXT,
        env VARCHAR,
        case_filters JSON,
        case_ids JSON,
        status VARCHAR DEFAULT 'active',
        created_at DATETIME,
        updated_at DATETIME,
        FOREIGN KEY(project_id) REFERENCES projects(id)
    )
    """)
    conn.commit()
    conn.close()
    print("Test plans table created.")

if __name__ == '__main__':
    migrate()
