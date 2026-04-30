from __future__ import annotations

import argparse
import json
from pathlib import Path

from backend.app import persistence


def seed() -> None:
    persistence.init_db()
    print(json.dumps({"status": "ok", "message": "Database initialized and seeded", "database": str(persistence.DB_PATH)}))


def reset(yes: bool) -> None:
    if not yes:
        raise SystemExit("Refusing to reset database without --yes")
    db_path = Path(persistence.DB_PATH)
    if db_path.exists():
        db_path.unlink()
    persistence.init_db()
    print(json.dumps({"status": "ok", "message": "Database reset and seeded", "database": str(db_path)}))


def doctor() -> None:
    persistence.init_db()
    payload = {
        "database": persistence.healthcheck(),
        "users": len(persistence.list_users()),
        "resources": len(persistence.list_resources(include_unpublished=True)),
    }
    print(json.dumps({"status": "ok", **payload}))


def main() -> None:
    parser = argparse.ArgumentParser(description="VCSA backend operations")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("seed", help="Initialize database and seed demo launch data")
    reset_parser = subcommands.add_parser("reset", help="Delete the configured SQLite database and reseed it")
    reset_parser.add_argument("--yes", action="store_true", help="Required confirmation for destructive reset")
    subcommands.add_parser("doctor", help="Check database health and seed counts")
    args = parser.parse_args()

    if args.command == "seed":
        seed()
    elif args.command == "reset":
        reset(args.yes)
    elif args.command == "doctor":
        doctor()


if __name__ == "__main__":
    main()
