"""为test_cases表添加feature列"""
import sqlite3
import os

def add_feature_column():
    # 获取数据库路径
    db_path = os.path.join(os.path.dirname(__file__), '../autotesthub.db')
    
    # 确保目录存在
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # 连接数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 检查列是否已存在
        cursor.execute("PRAGMA table_info(test_cases)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'feature' not in columns:
            print("Adding 'feature' column to test_cases table...")
            cursor.execute("ALTER TABLE test_cases ADD COLUMN feature TEXT")
            conn.commit()
            print("Successfully added 'feature' column!")
        else:
            print("'feature' column already exists.")
            
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_feature_column()
