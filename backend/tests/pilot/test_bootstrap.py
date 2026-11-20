import os
import tempfile
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.app.pilot import db, identity
from backend.app.pilot.app import app


class BootstrapTests(unittest.TestCase):
    def test_complete_private_application_and_seed_once(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {
            'VCSA_DB_PATH': folder+'/pilot.sqlite', 'PILOT_ASSET_DIR': folder+'/assets',
            'PILOT_SECURE_COOKIE':'false','PILOT_ORIGIN':'http://testserver'
        }):
            org=identity.create_organization('Test academy','test-academy')
            for _ in range(2):
                with TestClient(app) as client:
                    for path in ['/api/pilot/tours','/api/pilot/lessons','/api/pilot/notes','/api/pilot/diary','/api/pilot/owner/settings']:
                        self.assertEqual(client.get(path).status_code,401,path)
                    with db.read() as conn:
                        self.assertEqual(conn.execute('SELECT COUNT(*) FROM pilot_lessons WHERE organization_id=?',(org['id'],)).fetchone()[0],11)
                        self.assertEqual(conn.execute("SELECT COUNT(*) FROM pilot_lessons WHERE status='published'").fetchone()[0],0)
                        self.assertEqual(conn.execute("SELECT COUNT(*) FROM pilot_lessons WHERE team_access='open'").fetchone()[0],3)


if __name__=='__main__':
    unittest.main()
