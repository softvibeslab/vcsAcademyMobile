"""Synthetic TC-24 rehearsal. Never opens the configured production database.

Run from the repository: .venv/bin/python tools/pilot/verify_operations.py --http
Uses an isolated SQLite file, real auth cookies, the integrated ASGI app and
20 concurrent sessions. HTTP mode uses loopback only; no external providers.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack
import hashlib
import json
import math
import os
from pathlib import Path
import secrets
import shutil
import socket
import sqlite3
import sys
import tempfile
import threading
import time
from unittest.mock import patch
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi.testclient import TestClient
import httpx
import uvicorn
from backend.app.persistence import hash_password
from backend.app.pilot import bootstrap, db
from backend.app.pilot.app import app
from tools.pilot.backup import backup


SESSION_COUNT = 20
TOUR_COUNT = 10000
ROUNDS = 3


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def legacy_digest(path):
    with sqlite3.connect(path) as conn:
        rows = conn.execute("SELECT * FROM goalsheet_entries ORDER BY id").fetchall()
    encoded = json.dumps(rows, separators=(",", ":"), ensure_ascii=True).encode()
    return {"count": len(rows), "sha256": hashlib.sha256(encoded).hexdigest()}


def initialize_legacy(path, password):
    """Legacy aggregate rows predate the pilot; no tour is inferred from them."""
    password_hash = hash_password(password)
    with sqlite3.connect(path) as conn:
        conn.execute("""CREATE TABLE users (
            id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,roles_json TEXT NOT NULL DEFAULT '[]',team_id TEXT,
            permissions_json TEXT NOT NULL DEFAULT '[]',status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,updated_at TEXT NOT NULL)""")
        conn.execute("""CREATE TABLE goalsheet_entries (
            id TEXT PRIMARY KEY,user_id TEXT NOT NULL,entry_date TEXT NOT NULL,
            payload_json TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)""")
        for index in range(SESSION_COUNT):
            user_id = f"synthetic-{index:02d}"
            conn.execute("INSERT INTO users(id,email,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)", (user_id, f"{user_id}@example.invalid", f"Example {index:02d}", password_hash, db.now(), db.now()))
            conn.execute("INSERT INTO goalsheet_entries VALUES (?,?,?,?,?,?)", (f"legacy-{index:02d}", user_id, db.today(), json.dumps({"sales": 2, "volume": 1000, "synthetic": True}), db.now(), db.now()))


def seed_pilot():
    now, day = db.now(), db.today()
    with db.transaction() as conn:
        conn.execute("INSERT INTO pilot_organizations(id,slug,name,app_name,welcome_title_en,created_at,updated_at) VALUES ('synthetic-org','synthetic-org','Example','Example','Welcome',?,?)", (now, now))
        for index in range(SESSION_COUNT):
            user_id = f"synthetic-{index:02d}"
            conn.execute("UPDATE users SET organization_id='synthetic-org',pilot_role='representative',must_change_password=0 WHERE id=?", (user_id,))
            conn.execute("INSERT INTO pilot_allowed_emails(id,organization_id,email_normalized,role,user_id,created_at,updated_at) VALUES (?,'synthetic-org',?,'representative',?,?,?)", ("allow-" + user_id, f"{user_id}@example.invalid", user_id, now, now))
            conn.execute("INSERT INTO pilot_monthly_goals VALUES (?,'synthetic-org',?,?,100000000,2500,?,?)", ("goal-" + user_id, user_id, day[:7], now, now))
        rows = []
        for index in range(TOUR_COUNT):
            sold = index % 3 == 0
            rows.append((f"tour-{index:05d}", "synthetic-org", f"synthetic-{index % SESSION_COUNT:02d}", day, "q", "member" if index % 2 else "agency", "sold" if sold else "no_sale", 125000 if sold else 0, now if sold else None, now, now))
        conn.executemany("INSERT INTO pilot_tours(id,organization_id,user_id,occurred_on,tour_kind,channel,sale_status,net_volume_cents,sale_recorded_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", rows)
    bootstrap.initialize()


def timing_summary(values):
    ordered = sorted(values)
    return {"samples": len(values), "p50_ms": round(ordered[math.ceil(len(ordered) * .50) - 1], 2), "p95_ms": round(ordered[math.ceil(len(ordered) * .95) - 1], 2), "maximum_ms": round(ordered[-1], 2)}


def start_http_server(stack):
    """One real ASGI event loop, matching the deployed single-worker topology."""
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind(("127.0.0.1", 0))
    listener.listen(128)
    address = f"http://127.0.0.1:{listener.getsockname()[1]}"
    server = uvicorn.Server(uvicorn.Config(app, log_level="warning", access_log=False))
    worker = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)

    def stop():
        server.should_exit = True
        worker.join(timeout=5)
        if worker.is_alive():
            server.force_exit = True
            worker.join(timeout=2)
        listener.close()

    stack.callback(stop)
    worker.start()
    deadline = time.monotonic() + 10
    while not server.started and worker.is_alive() and time.monotonic() < deadline:
        time.sleep(.01)
    require(server.started, "Isolated HTTP server failed to start")
    return address


def main(http_mode=False):
    started = time.perf_counter()
    environment = "isolated uvicorn over loopback HTTP; one ASGI event loop; real temporary SQLite" if http_mode else "local integrated ASGI via TestClient; separate client portals; real temporary SQLite"
    report = {"scenario": "TC-24 / NFR-08", "environment": environment, "synthetic_only": True}
    with tempfile.TemporaryDirectory(prefix="pilot-operations-") as directory, ExitStack() as stack:
        root = Path(directory)
        database = root / "active.sqlite3"
        asset_dir = root / "private-assets"
        asset_dir.mkdir(mode=0o700)
        stack.enter_context(patch.dict(os.environ, {"VCSA_DB_PATH": str(database), "PILOT_ASSET_DIR": str(asset_dir), "PILOT_ORIGIN": "http://testserver", "PILOT_SECURE_COOKIE": "false", "PILOT_TRUST_PROXY": "false"}))
        password = secrets.token_urlsafe(24)
        initialize_legacy(database, password)
        before = legacy_digest(database)
        bootstrap.initialize()
        first = legacy_digest(database)
        bootstrap.initialize()
        second = legacy_digest(database)
        require(before == first == second, "Legacy content changed across additive migrations")
        with db.read() as conn:
            require(conn.execute("SELECT COUNT(*) FROM pilot_tours").fetchone()[0] == 0, "Aggregate legacy rows were fabricated as tours")
        report["legacy_migration"] = {"runs": 2, "before": before, "after": second, "unchanged": True, "fabricated_tours": 0}
        seed_pilot()
        address = start_http_server(stack) if http_mode else "http://testserver"
        stack.enter_context(patch.dict(os.environ, {"PILOT_ORIGIN": address}))
        clients = []
        for index in range(SESSION_COUNT):
            client = httpx.Client(base_url=address, headers={"Origin": address}, timeout=20) if http_mode else TestClient(app, headers={"Origin": address})
            stack.callback(client.close)
            response = client.post("/api/auth/login", json={"email": f"synthetic-{index:02d}@example.invalid", "password": password})
            require(response.status_code == 200, f"Synthetic login failed: {response.status_code}")
            client.headers["X-CSRF-Token"] = response.json()["data"]["csrf_token"]
            clients.append(client)
        with db.read() as conn:
            require(conn.execute("SELECT COUNT(*) FROM pilot_sessions WHERE revoked_at IS NULL").fetchone()[0] == SESSION_COUNT, "Expected 20 distinct active sessions")
        old = clients[0].get("/api/pilot/legacy/goalsheets").json()["data"]
        require(len(old["entries"]) == 1 and old["included_in_pilot_metrics"] is False, "Legacy route must remain own-user and excluded from metrics")

        barrier = threading.Barrier(SESSION_COUNT, timeout=20)
        routes = {"home_metrics": "/api/pilot/metrics?period=month", "tour_list": "/api/pilot/tours?limit=25", "notes_list": "/api/pilot/notes?limit=25", "followups_list": "/api/pilot/followups?limit=25", "lesson_list": "/api/pilot/lessons?limit=25"}

        def exercise(index):
            client, readings = clients[index], []
            barrier.wait()

            def fetch(name):
                tick = time.perf_counter()
                response = client.get(routes[name])
                elapsed = (time.perf_counter() - tick) * 1000
                require(response.status_code == 200, f"{name} returned {response.status_code}")
                data = response.json()["data"]
                if name == "home_metrics":
                    require(data["activity_totals"]["records"] == TOUR_COUNT // SESSION_COUNT, "Metrics lost isolation or included legacy data")
                if name == "tour_list":
                    require(len(data["items"]) == 25 and all(row["user_id"] == f"synthetic-{index:02d}" for row in data["items"]), "Tour listing leaked another user's records")
                return name, elapsed

            with ThreadPoolExecutor(max_workers=2) as home_pool:
                for _ in range(ROUNDS):
                    tick = time.perf_counter()
                    home_calls = [home_pool.submit(fetch, name) for name in ("home_metrics", "followups_list")]
                    readings.extend(call.result(timeout=20) for call in home_calls)
                    readings.append(("home_bundle_parallel", (time.perf_counter() - tick) * 1000))
                    for name in ("tour_list", "notes_list", "lesson_list"):
                        readings.append(fetch(name))
            return readings

        with ThreadPoolExecutor(max_workers=SESSION_COUNT) as executor:
            futures = [executor.submit(exercise, index) for index in range(SESSION_COUNT)]
            readings = [reading for future in futures for reading in future.result(timeout=80)]
        names = [*routes, "home_bundle_parallel"]
        summary = {name: timing_summary([value for key, value in readings if key == name]) for name in names}
        report["performance"] = {"sessions": SESSION_COUNT, "tours": TOUR_COUNT, "rounds_per_session": ROUNDS, "requests": SESSION_COUNT * ROUNDS * len(routes), "threshold_p95_ms": 1000, "home_request_pattern": "metrics + followups in parallel, matching UI", "measurements": summary, "api_gate_passed": all(summary[name]["p95_ms"] < 1000 for name in routes), "home_gate_passed": summary["home_bundle_parallel"]["p95_ms"] < 1000}

        # Snapshot/restore validation includes a registered private synthetic asset.
        pdf = asset_dir / "synthetic-script.pdf"
        pdf.write_bytes(b"%PDF-1.7\nSynthetic operations rehearsal\n%%EOF\n")
        asset_hash = hashlib.sha256(pdf.read_bytes()).hexdigest()
        with db.transaction() as conn:
            conn.execute("INSERT INTO pilot_assets(id,organization_id,uploaded_by,storage_key,name,mime,bytes,sha256,status,created_at) VALUES ('synthetic-asset','synthetic-org','synthetic-00','synthetic-script.pdf','Example script.pdf','application/pdf',?,?,'ready',?)", (pdf.stat().st_size, asset_hash, db.now()))
        snapshot = root / "backup" / "before-sale.sqlite3"
        saved = backup(database, snapshot)
        require(saved["restored"] and saved["integrity"] == "ok", "Backup restore failed")
        require(saved["table_counts"]["pilot_tours"] == TOUR_COUNT, "Snapshot row count differs")
        require(saved["table_counts"]["pilot_assets"] == 1, "Snapshot lost registered asset")
        assets_backup = root / "backup" / "assets"
        shutil.copytree(asset_dir, assets_backup)
        assets_restore = root / "restored-assets"
        shutil.copytree(assets_backup, assets_restore)
        require(hashlib.sha256((assets_restore / pdf.name).read_bytes()).hexdigest() == asset_hash, "Restored asset checksum mismatch")
        report["backup_restore"] = {"database": saved, "asset_sha256": asset_hash, "asset_restore_verified": True}

        created = clients[0].post("/api/pilot/tours", json={"client_request_id": str(uuid4()), "occurred_on": db.today(), "tour_kind": "q", "channel": "member", "sale_status": "sold", "net_volume_cents": 234567})
        require(created.status_code == 201, "Post-snapshot sale could not be saved")
        sale_id = created.json()["data"]["tour"]["id"]
        # A compatible release restart retains the active DB. Restoring the old
        # snapshot would lose this sale, and is explicitly not the rollback policy.
        bootstrap.initialize()
        resumed = clients[0].get("/api/pilot/tours?limit=25")
        require(resumed.status_code == 200 and any(row["id"] == sale_id for row in resumed.json()["data"]["items"]), "Restart/rollback rehearsal lost the newer sale")
        with db.read() as conn:
            active_count = conn.execute("SELECT COUNT(*) FROM pilot_tours").fetchone()[0]
            require(active_count == TOUR_COUNT + 1, "Current DB lost new writes")
            require(conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok", "Current DB integrity failed")
            require(conn.execute("PRAGMA foreign_key_check").fetchall() == [], "Foreign-key validation failed")
        with sqlite3.connect(snapshot) as conn:
            require(conn.execute("SELECT COUNT(*) FROM pilot_tours WHERE id=?", (sale_id,)).fetchone()[0] == 0, "Snapshot must predate the new sale")
        require(legacy_digest(database) == before, "Legacy rows changed during rehearsal")
        report["rollback_data_rehearsal"] = {"strategy": "compatible pilot initialization with current DB; no old snapshot restore", "snapshot_tours": TOUR_COUNT, "current_tours": active_count, "post_snapshot_sale_preserved": True, "container_proxy_switch_exercised": False}
        forbidden = ["/api/auth/demo-users", "/api/public/catalog", "/api/blueprint/steps", "/api/admin/users"]
        statuses = {path: clients[0].get(path).status_code for path in forbidden}
        require(all(value == 404 for value in statuses.values()), "Legacy endpoint exposed")
        report["legacy_endpoints"] = statuses
        report["elapsed_seconds"] = round(time.perf_counter() - started, 2)
        report["limitations"] = ["Loopback HTTP includes socket transport and one uvicorn event loop; TestClient mode uses separate portals and is not a deployment performance substitute. Both exclude nginx, TLS and external network latency.", "The report describes its execution machine; a local run does not establish VPS performance.", "Rollback check validates data preservation on a compatible pilot restart; it is not a deployed reverse-proxy/container rollback.", "Asset copy/restore is a synthetic rehearsal; deployment must back up its private asset directory too."]
        print(json.dumps(report, indent=2, sort_keys=True))
        require(report["performance"]["api_gate_passed"], "API p95 exceeded 1000 ms")
        require(report["performance"]["home_gate_passed"], "Home parallel p95 exceeded 1000 ms")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--http", action="store_true", help="Run one isolated uvicorn event loop on a temporary loopback port")
    args = parser.parse_args()
    main(http_mode=args.http)
