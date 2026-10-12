"""相机用例元数据增量迁移；可重复执行，保留现有用例和状态。"""
from sqlalchemy import inspect, text
from app.database import engine


def migrate(bind=engine):
    inspector = inspect(bind)
    if 'test_cases' not in inspector.get_table_names():
        return
    columns = {c['name'] for c in inspector.get_columns('test_cases')}
    with bind.begin() as connection:
        for name in ('description', 'test_class', 'preconditions', 'script_path'):
            if name not in columns:
                connection.execute(text(f'ALTER TABLE test_cases ADD COLUMN {name} TEXT'))


if __name__ == '__main__':
    migrate()
