"""隔离数据库验证分类元数据、幂等同步和向后兼容。"""
import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.endpoints import router
from app.database import Base, get_db
from app.models.domain import Project
from app.migrate_camera_metadata import migrate


def test_sync_camera_roundtrip():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    with Session() as db:
        db.add(Project(id='camera-project', name='Camera'))
        db.commit()
    def override_db():
        with Session() as db:
            yield db
    app = FastAPI()
    app.include_router(router, prefix='/api')
    app.dependency_overrides[get_db] = override_db
    catalog = Path(__file__).resolve().parents[3] / 'autotestrunner/testcases/camera/catalog.json'
    cases = json.loads(catalog.read_text(encoding='utf-8'))
    for case in cases:
        case['script_path'] = 'camera/' + case['script_path'] + '::' + case.pop('function')
    payload = {'project_id': 'camera-project', 'test_cases': cases}
    with TestClient(app) as client:
        first = client.post('/api/sync/test-cases', json=payload)
        assert first.status_code == 200, first.text
        assert first.json()['created'] == len(cases)
        assert client.post('/api/sync/test-cases', json=payload).json()['updated'] == len(cases)
        rows = client.get('/api/projects/camera-project/test-cases').json()
        assert len(rows) == len(cases)
        assert len({r['test_class'] for r in rows}) == len({r['test_class'] for r in cases})
        assert all(r['description'] and r['preconditions'] and r['feature'].startswith('camera/') for r in rows)
        saved = rows[0]
        client.put('/api/test-cases/' + saved['id'], json={'status': 'enabled'})
        legacy = {k: cases[0][k] for k in ('local_case_id','title','priority','steps','expected_result')}
        assert client.post('/api/sync/test-cases', json={'project_id':'camera-project','test_cases':[legacy]}).status_code == 200
        updated = client.get('/api/test-cases/' + saved['id']).json()
        assert updated['description'] == saved['description'] and updated['status'] == 'enabled'
        assert client.post('/api/sync/test-cases', json={**payload, 'project_id':'missing'}).status_code == 404
    engine.dispose()


def test_migration_idempotent_preserves_existing_data():
    engine = create_engine('sqlite://')
    with engine.begin() as db:
        db.execute(text('CREATE TABLE test_cases (id TEXT PRIMARY KEY, title TEXT)'))
        db.execute(text("INSERT INTO test_cases VALUES ('old', 'keep')"))
    migrate(engine)
    migrate(engine)
    assert {'description','test_class','preconditions','script_path'} <= {c['name'] for c in inspect(engine).get_columns('test_cases')}
    with engine.connect() as db:
        assert db.execute(text('SELECT title FROM test_cases WHERE id=\'old\'')).scalar() == 'keep'
    engine.dispose()
