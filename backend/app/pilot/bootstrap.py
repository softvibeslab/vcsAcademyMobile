"""Additive initialization; no demo accounts or published media are seeded."""
from . import activity, assets, db, learning, workspace


def initialize():
    db.initialize()
    with db.transaction() as conn:
        activity.init_schema(conn)
        workspace.init_schema(conn)
        learning.init_schema(conn)
        assets.init_schema(conn)
        for row in conn.execute('SELECT id FROM pilot_organizations').fetchall():
            learning.seed_roadmap(conn, row['id'])
