"""Individual sales tours and immutable monthly budgets, scoped on the server."""
import base64
import json
from datetime import date, datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from . import db
from .auth import require_user
from .errors import fail, ok
from .metrics import calculate_from_totals, effective_q

router = APIRouter()


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TourCreate(StrictModel):
    client_request_id: UUID
    occurred_on: str
    tour_kind: Literal["q", "ct", "nq", "no_tour"]
    channel: Literal["agency", "member"] | None = None
    sale_status: Literal["sold", "no_sale"] | None = None
    net_volume_cents: int = Field(default=0, ge=0, le=100000000, strict=True)


class TourPatch(StrictModel):
    expected_version: int = Field(ge=1, strict=True)
    occurred_on: str | None = None
    tour_kind: Literal["q", "ct", "nq", "no_tour"] | None = None
    channel: Literal["agency", "member"] | None = None
    sale_status: Literal["sold", "no_sale"] | None = None
    net_volume_cents: int | None = Field(default=None, ge=0, le=100000000, strict=True)


class VersionIn(StrictModel):
    expected_version: int = Field(ge=1, strict=True)


class CancelIn(VersionIn):
    reason_code: Literal["customer_cancelled", "entry_correction", "other"]


class VoidIn(VersionIn):
    reason_code: Literal["duplicate", "entry_error", "other"]


class FollowupCreate(StrictModel):
    client_request_id: UUID
    due_at: str
    action_text: str = Field(min_length=1, max_length=500)


class FollowupPatch(VersionIn):
    due_at: str | None = None
    action_text: str | None = Field(default=None, min_length=1, max_length=500)
    status: Literal["pending", "done", "cancelled"] | None = None


class GoalCreate(StrictModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    budget_volume_cents: int = Field(gt=0, le=10000000000, strict=True)
    target_close_bps: int | None = Field(default=None, ge=0, le=10000, strict=True)


def valid_day(value, *, future=False):
    try:
        parsed = date.fromisoformat(value)
        if parsed.isoformat() != value or (not future and value > db.today()):
            raise ValueError()
    except (ValueError, TypeError):
        fail(422, "invalid_date")
    return value


def date_range(start=None, end=None):
    end = valid_day(end or db.today())
    start = valid_day(start or (date.fromisoformat(end) - timedelta(days=30)).isoformat())
    if start > end or (date.fromisoformat(end) - date.fromisoformat(start)).days > 366:
        fail(422, "invalid_date_range")
    return start, end


def page_offset(cursor):
    if cursor is None:
        return 0
    try:
        if len(cursor) > 64:
            raise ValueError()
        value = int(base64.urlsafe_b64decode(cursor.encode()).decode())
        if value < 0 or value > 1000000:
            raise ValueError()
        return value
    except (ValueError, TypeError, UnicodeError):
        fail(422, "invalid_cursor")


def paginate(rows, offset, limit):
    return {"items": rows[:limit], "next_cursor":
            base64.urlsafe_b64encode(str(offset + limit).encode()).decode() if len(rows) > limit else None}


def scoped_tour(conn, user, tour_id):
    row = conn.execute("SELECT * FROM pilot_tours WHERE id=? AND organization_id=? AND user_id=?",
                       (tour_id, user["organization_id"], user["id"])).fetchone()
    if row is None:
        fail(404, "not_found")
    return row


def tour_view(row):
    result = dict(row)
    result["effective_q"] = effective_q(result)
    return result


def validate_tour(payload, allow_cancelled=False):
    value = {key: payload.get(key) for key in ("occurred_on", "tour_kind", "channel", "sale_status")}
    value["net_volume_cents"] = payload.get("net_volume_cents", 0)
    valid_day(value["occurred_on"])
    kind, sale, cents = value["tour_kind"], value["sale_status"], value["net_volume_cents"]
    if kind not in ("q", "ct", "nq", "no_tour") or value["channel"] not in (None, "agency", "member"):
        fail(422, "invalid_tour")
    if not isinstance(cents, int) or isinstance(cents, bool) or not 0 <= cents <= 100000000:
        fail(422, "invalid_amount")
    if kind == "no_tour":
        if sale is not None or cents:
            fail(422, "no_tour_has_no_sale")
        value.update(sale_status=None, net_volume_cents=0)
    else:
        allowed = ("sold", "no_sale", "cancelled") if allow_cancelled else ("sold", "no_sale")
        if value["channel"] is None or sale not in allowed:
            fail(422, "tour_result_required")
        if (sale in ("sold", "cancelled") and cents <= 0) or (sale == "no_sale" and cents != 0):
            fail(422, "invalid_sale_amount")
    return value


def init_schema(conn):
    statements = [
        "CREATE UNIQUE INDEX IF NOT EXISTS pilot_users_org_identity ON users(id,organization_id)",
        """CREATE TABLE IF NOT EXISTS pilot_tours (
            id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT NOT NULL,
            occurred_on TEXT NOT NULL, tour_kind TEXT NOT NULL CHECK(tour_kind IN ('q','ct','nq','no_tour')),
            channel TEXT CHECK(channel IN ('agency','member')), sale_status TEXT CHECK(sale_status IN ('sold','no_sale','cancelled')),
            net_volume_cents INTEGER NOT NULL DEFAULT 0 CHECK(net_volume_cents BETWEEN 0 AND 100000000),
            sale_recorded_at TEXT, cancelled_at TEXT, cancellation_reason_code TEXT,
            record_status TEXT NOT NULL DEFAULT 'active' CHECK(record_status IN ('active','voided')),
            void_reason_code TEXT, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            UNIQUE(id,organization_id,user_id), FOREIGN KEY(user_id,organization_id) REFERENCES users(id,organization_id))""",
        "CREATE INDEX IF NOT EXISTS pilot_tour_period ON pilot_tours(organization_id,user_id,occurred_on,id)",
        "CREATE INDEX IF NOT EXISTS pilot_tour_metric_period ON pilot_tours(organization_id,user_id,record_status,occurred_on,tour_kind,channel,sale_status,net_volume_cents)",
        """CREATE TABLE IF NOT EXISTS pilot_followups (
            id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT NOT NULL, tour_id TEXT NOT NULL,
            due_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','cancelled')),
            action_text TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            FOREIGN KEY(tour_id,organization_id,user_id) REFERENCES pilot_tours(id,organization_id,user_id))""",
        "CREATE INDEX IF NOT EXISTS pilot_followup_due ON pilot_followups(organization_id,user_id,status,due_at,id)",
        """CREATE TABLE IF NOT EXISTS pilot_monthly_goals (
            id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT NOT NULL, month TEXT NOT NULL,
            budget_volume_cents INTEGER NOT NULL CHECK(budget_volume_cents > 0 AND budget_volume_cents <= 10000000000),
            target_close_bps INTEGER CHECK(target_close_bps BETWEEN 0 AND 10000),
            confirmed_at TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(organization_id,user_id,month),
            FOREIGN KEY(user_id,organization_id) REFERENCES users(id,organization_id))""",
        """CREATE TRIGGER IF NOT EXISTS pilot_goal_no_update BEFORE UPDATE ON pilot_monthly_goals
            BEGIN SELECT RAISE(ABORT, 'monthly_goal_immutable'); END""",
        """CREATE TRIGGER IF NOT EXISTS pilot_goal_no_delete BEFORE DELETE ON pilot_monthly_goals
            BEGIN SELECT RAISE(ABORT, 'monthly_goal_immutable'); END""",
    ]
    for statement in statements:
        conn.execute(statement)


@router.get("/api/pilot/tours")
def list_tours(from_date: str | None = Query(None, alias="from"), to: str | None = None,
               cursor: str | None = None, limit: int = Query(25, ge=1, le=100), user=Depends(require_user)):
    start, end = date_range(from_date, to)
    offset = page_offset(cursor)
    with db.read() as conn:
        rows = conn.execute("SELECT * FROM pilot_tours WHERE organization_id=? AND user_id=? AND occurred_on BETWEEN ? AND ? ORDER BY occurred_on DESC,created_at DESC,id DESC LIMIT ? OFFSET ?",
                            (user["organization_id"], user["id"], start, end, limit + 1, offset)).fetchall()
    return ok(paginate([tour_view(row) for row in rows], offset, limit))


@router.post("/api/pilot/tours", status_code=201)
def create_tour(body: TourCreate, user=Depends(require_user)):
    payload = body.model_dump(mode="json")
    key = payload.pop("client_request_id")
    values = validate_tour(payload)
    with db.transaction() as conn:
        replay = db.idempotent(conn, user, "tour_create", key, values)
        if replay is not None:
            return ok(replay)
        identifier, timestamp = db.new_id(), db.now()
        conn.execute("""INSERT INTO pilot_tours
            (id,organization_id,user_id,occurred_on,tour_kind,channel,sale_status,net_volume_cents,sale_recorded_at,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?)""", (identifier, user["organization_id"], user["id"], values["occurred_on"],
            values["tour_kind"], values["channel"], values["sale_status"], values["net_volume_cents"],
            timestamp if values["sale_status"] == "sold" else None, timestamp, timestamp))
        data = {"tour": tour_view(scoped_tour(conn, user, identifier))}
        db.audit(conn, user, "tour_created", "tour", identifier, values)
        db.remember(conn, user, "tour_create", key, values, data)
    return ok(data)


def cancel_pending(conn, user, tour_id):
    conn.execute("UPDATE pilot_followups SET status='cancelled',version=version+1,updated_at=? WHERE tour_id=? AND organization_id=? AND user_id=? AND status='pending'",
                 (db.now(), tour_id, user["organization_id"], user["id"]))


@router.patch("/api/pilot/tours/{tour_id}")
def patch_tour(tour_id: str, body: TourPatch, user=Depends(require_user)):
    updates = body.model_dump(exclude_unset=True)
    expected = updates.pop("expected_version")
    if not updates:
        fail(422, "changes_required")
    with db.transaction() as conn:
        current = scoped_tour(conn, user, tour_id)
        db.check_version(current, expected)
        if current["record_status"] != "active":
            fail(409, "tour_inactive")
        if current["sale_status"] == "cancelled" and "sale_status" in updates and updates["sale_status"] == "sold":
            fail(409, "use_restore_sale")
        values = validate_tour({**dict(current), **updates}, allow_cancelled=True)
        conn.execute("""UPDATE pilot_tours SET occurred_on=?,tour_kind=?,channel=?,sale_status=?,net_volume_cents=?,
            sale_recorded_at=?,version=version+1,updated_at=? WHERE id=? AND organization_id=? AND user_id=?""",
            (values["occurred_on"], values["tour_kind"], values["channel"], values["sale_status"], values["net_volume_cents"],
             current["sale_recorded_at"] or (db.now() if values["sale_status"] == "sold" else None), db.now(), tour_id, user["organization_id"], user["id"]))
        if values["sale_status"] != "sold":
            cancel_pending(conn, user, tour_id)
        db.audit(conn, user, "tour_corrected", "tour", tour_id, {"previous_version": expected, "previous":
            {k: current[k] for k in values}, "current": values})
        return ok({"tour": tour_view(scoped_tour(conn, user, tour_id))})


def transition(tour_id, user, expected, action, reason=None):
    with db.transaction() as conn:
        current = scoped_tour(conn, user, tour_id)
        db.check_version(current, expected)
        sale, record = current["sale_status"], current["record_status"]
        if action == "cancel-sale":
            if sale != "sold" or record != "active":
                fail(409, "sale_not_active")
            conn.execute("UPDATE pilot_tours SET sale_status='cancelled',cancelled_at=?,cancellation_reason_code=?,version=version+1,updated_at=? WHERE id=?",
                         (db.now(), reason, db.now(), tour_id))
            cancel_pending(conn, user, tour_id)
        elif action == "restore-sale":
            if sale != "cancelled" or record != "active":
                fail(409, "sale_not_cancelled")
            conn.execute("UPDATE pilot_tours SET sale_status='sold',cancelled_at=NULL,cancellation_reason_code=NULL,version=version+1,updated_at=? WHERE id=?", (db.now(), tour_id))
        elif action == "void":
            if record != "active":
                fail(409, "tour_inactive")
            conn.execute("UPDATE pilot_tours SET record_status='voided',void_reason_code=?,version=version+1,updated_at=? WHERE id=?", (reason, db.now(), tour_id))
            cancel_pending(conn, user, tour_id)
        else:
            if record != "voided":
                fail(409, "tour_not_voided")
            validate_tour(dict(current), allow_cancelled=True)
            conn.execute("UPDATE pilot_tours SET record_status='active',void_reason_code=NULL,version=version+1,updated_at=? WHERE id=?", (db.now(), tour_id))
        updated = scoped_tour(conn, user, tour_id)
        db.audit(conn, user, "tour_" + action.replace("-", "_"), "tour", tour_id,
                 {"previous_version": expected, "version": updated["version"], "reason_code": reason,
                  "occurred_on": current["occurred_on"], "net_volume_cents": current["net_volume_cents"]})
        return ok({"tour": tour_view(updated)})


@router.post("/api/pilot/tours/{tour_id}/cancel-sale")
def cancel_sale(tour_id: str, body: CancelIn, user=Depends(require_user)):
    return transition(tour_id, user, body.expected_version, "cancel-sale", body.reason_code)


@router.post("/api/pilot/tours/{tour_id}/restore-sale")
def restore_sale(tour_id: str, body: VersionIn, user=Depends(require_user)):
    return transition(tour_id, user, body.expected_version, "restore-sale")


@router.post("/api/pilot/tours/{tour_id}/void")
def void_tour(tour_id: str, body: VoidIn, user=Depends(require_user)):
    return transition(tour_id, user, body.expected_version, "void", body.reason_code)


@router.post("/api/pilot/tours/{tour_id}/restore")
def restore_tour(tour_id: str, body: VersionIn, user=Depends(require_user)):
    return transition(tour_id, user, body.expected_version, "restore")


def normalize_due(value):
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError()
        return parsed.astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError, AttributeError):
        fail(422, "invalid_due_date")


@router.get("/api/pilot/tours/{tour_id}/followups")
def tour_followups(tour_id: str, cursor: str | None = None,
                   limit: int = Query(25, ge=1, le=100), user=Depends(require_user)):
    offset = page_offset(cursor)
    with db.read() as conn:
        scoped_tour(conn, user, tour_id)
        rows = conn.execute("SELECT * FROM pilot_followups WHERE tour_id=? AND organization_id=? AND user_id=? ORDER BY due_at,id LIMIT ? OFFSET ?",
                            (tour_id, user["organization_id"], user["id"], limit + 1, offset)).fetchall()
        return ok(paginate([dict(row) for row in rows], offset, limit))


@router.post("/api/pilot/tours/{tour_id}/followups", status_code=201)
def create_followup(tour_id: str, body: FollowupCreate, user=Depends(require_user)):
    values = {"tour_id": tour_id, "due_at": normalize_due(body.due_at), "action_text": body.action_text.strip()}
    if not values["action_text"]:
        fail(422, "action_required")
    with db.transaction() as conn:
        tour = scoped_tour(conn, user, tour_id)
        replay = db.idempotent(conn, user, "followup_create", str(body.client_request_id), values)
        if replay is not None:
            return ok(replay)
        if tour["sale_status"] != "sold" or tour["record_status"] != "active":
            fail(409, "followup_requires_sale")
        identifier, timestamp = db.new_id(), db.now()
        conn.execute("INSERT INTO pilot_followups(id,organization_id,user_id,tour_id,due_at,action_text,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                     (identifier, user["organization_id"], user["id"], tour_id, values["due_at"], values["action_text"], timestamp, timestamp))
        data = {"followup": dict(conn.execute("SELECT * FROM pilot_followups WHERE id=?", (identifier,)).fetchone())}
        db.audit(conn, user, "followup_created", "followup", identifier, {"tour_id": tour_id})
        db.remember(conn, user, "followup_create", str(body.client_request_id), values, data)
        return ok(data)


@router.get("/api/pilot/followups")
def list_followups(status: Literal["pending", "done", "cancelled"] | None = "pending", cursor: str | None = None,
                   limit: int = Query(25, ge=1, le=100), user=Depends(require_user)):
    offset = page_offset(cursor)
    with db.read() as conn:
        rows = conn.execute("SELECT * FROM pilot_followups WHERE organization_id=? AND user_id=? AND (? IS NULL OR status=?) ORDER BY due_at,id LIMIT ? OFFSET ?",
                            (user["organization_id"], user["id"], status, status, limit + 1, offset)).fetchall()
        return ok(paginate([dict(row) for row in rows], offset, limit))


@router.patch("/api/pilot/followups/{followup_id}")
def patch_followup(followup_id: str, body: FollowupPatch, user=Depends(require_user)):
    changes = body.model_dump(exclude_unset=True)
    expected = changes.pop("expected_version")
    if not changes or any(value is None for value in changes.values()):
        fail(422, "changes_required")
    if "due_at" in changes:
        changes["due_at"] = normalize_due(changes["due_at"])
    if "action_text" in changes:
        changes["action_text"] = changes["action_text"].strip()
        if not changes["action_text"]:
            fail(422, "action_required")
    with db.transaction() as conn:
        current = conn.execute("SELECT * FROM pilot_followups WHERE id=? AND organization_id=? AND user_id=?",
                               (followup_id, user["organization_id"], user["id"])).fetchone()
        db.check_version(current, expected)
        if current["status"] != "pending":
            fail(409, "followup_closed")
        tour = scoped_tour(conn, user, current["tour_id"])
        if (tour["sale_status"] != "sold" or tour["record_status"] != "active") and changes != {"status": "cancelled"}:
            fail(409, "followup_requires_sale")
        values = {**dict(current), **changes}
        conn.execute("UPDATE pilot_followups SET due_at=?,action_text=?,status=?,version=version+1,updated_at=? WHERE id=? AND organization_id=? AND user_id=?",
                     (values["due_at"], values["action_text"], values["status"], db.now(), followup_id, user["organization_id"], user["id"]))
        db.audit(conn, user, "followup_updated", "followup", followup_id, {"previous_version": expected, "status": values["status"]})
        return ok({"followup": dict(conn.execute("SELECT * FROM pilot_followups WHERE id=?", (followup_id,)).fetchone())})


def valid_month(month):
    if not isinstance(month, str) or len(month) != 7:
        fail(422, "invalid_month")
    valid_day(month + "-01", future=True)
    return month


@router.get("/api/pilot/monthly-goals/{month}")
def get_goal(month: str, user=Depends(require_user)):
    valid_month(month)
    with db.read() as conn:
        row = conn.execute("SELECT * FROM pilot_monthly_goals WHERE organization_id=? AND user_id=? AND month=?",
                           (user["organization_id"], user["id"], month)).fetchone()
        return ok({"goal": dict(row) if row else None})


@router.post("/api/pilot/monthly-goals", status_code=201)
def create_goal(body: GoalCreate, user=Depends(require_user)):
    if body.month != db.today()[:7]:
        fail(422, "goal_current_month_only")
    with db.transaction() as conn:
        existing = conn.execute("SELECT id FROM pilot_monthly_goals WHERE organization_id=? AND user_id=? AND month=?",
                                (user["organization_id"], user["id"], body.month)).fetchone()
        if existing:
            # Commit the rejection audit before returning a conflict to the client.
            db.audit(conn, user, "monthly_goal_duplicate_rejected", "monthly_goal", existing["id"], {"month": body.month})
        else:
            identifier, timestamp = db.new_id(), db.now()
            conn.execute("INSERT INTO pilot_monthly_goals VALUES(?,?,?,?,?,?,?,?)", (identifier, user["organization_id"], user["id"], body.month,
                         body.budget_volume_cents, body.target_close_bps, timestamp, timestamp))
            db.audit(conn, user, "monthly_goal_confirmed", "monthly_goal", identifier, body.model_dump())
            result = {"goal": dict(conn.execute("SELECT * FROM pilot_monthly_goals WHERE id=?", (identifier,)).fetchone())}
    if existing:
        fail(409, "monthly_goal_exists")
    return ok(result)


@router.api_route("/api/pilot/monthly-goals", methods=["PATCH", "PUT", "DELETE"])
@router.api_route("/api/pilot/monthly-goals/{goal_id}", methods=["PATCH", "PUT", "DELETE"])
def immutable_goal(request: Request, goal_id: str | None = None, user=Depends(require_user)):
    with db.transaction() as conn:
        row = conn.execute("SELECT id FROM pilot_monthly_goals WHERE organization_id=? AND user_id=? AND (id=? OR month=?)",
                           (user["organization_id"], user["id"], goal_id, goal_id or db.today()[:7])).fetchone()
        db.audit(conn, user, "monthly_goal_mutation_rejected", "monthly_goal", row["id"] if row else user["id"], {"method": request.method})
    fail(405, "monthly_goal_immutable")


def aggregate_period(conn, user, start, end):
    # Aggregate while the SQLite VM holds the rows. Fetching every tour and
    # allocating full Python dictionaries scales poorly across active sessions.
    row = conn.execute("""SELECT COUNT(*) AS records,
        COUNT(CASE WHEN tour_kind!='no_tour' THEN 1 END) AS tours,
        COUNT(CASE WHEN tour_kind='q' OR (tour_kind IN ('ct','nq') AND sale_status='sold') THEN 1 END) AS qualified_tours,
        COUNT(CASE WHEN tour_kind!='no_tour' AND sale_status='sold' THEN 1 END) AS sales,
        COALESCE(SUM(CASE WHEN tour_kind!='no_tour' AND sale_status='sold' THEN net_volume_cents ELSE 0 END),0) AS net_volume_cents,
        COUNT(CASE WHEN tour_kind='q' THEN 1 END) AS type_q,
        COUNT(CASE WHEN tour_kind='ct' THEN 1 END) AS type_ct,
        COUNT(CASE WHEN tour_kind='nq' THEN 1 END) AS type_nq,
        COUNT(CASE WHEN tour_kind='no_tour' THEN 1 END) AS no_tour,
        COUNT(CASE WHEN tour_kind!='no_tour' AND channel='agency' THEN 1 END) AS channel_agency,
        COUNT(CASE WHEN tour_kind!='no_tour' AND channel='member' THEN 1 END) AS channel_member
        FROM pilot_tours WHERE organization_id=? AND user_id=? AND record_status='active' AND occurred_on BETWEEN ? AND ?""",
        (user["organization_id"], user["id"], start, end)).fetchone()
    result = {key: row[key] for key in ("records", "tours", "qualified_tours", "sales", "net_volume_cents", "no_tour")}
    result["types"] = {"q": row["type_q"], "ct": row["type_ct"], "nq": row["type_nq"], "no_tour": row["no_tour"]}
    result["channels"] = {"agency": row["channel_agency"], "member": row["channel_member"]}
    return result


def metrics_for_user(conn, user, period="today", anchor_date=None):
    anchor = valid_day(anchor_date or db.today())
    day = date.fromisoformat(anchor)
    if period not in ("today", "week", "month"):
        fail(422, "invalid_period")
    start = anchor if period == "today" else ((day - timedelta(days=day.weekday())).isoformat() if period == "week" else anchor[:7] + "-01")
    month_start = anchor[:7] + "-01"
    activity = aggregate_period(conn, user, start, anchor)
    monthly = activity if start == month_start else aggregate_period(conn, user, month_start, anchor)
    goal = conn.execute("SELECT * FROM pilot_monthly_goals WHERE organization_id=? AND user_id=? AND month=?", (user["organization_id"], user["id"], anchor[:7])).fetchone()
    result = calculate_from_totals(activity, monthly, dict(goal) if goal else None)
    return {**result, "activity_period": {"from": start, "to": anchor}, "budget_month": anchor[:7], "timezone": "America/Cancun", "currency": "USD"}


@router.get("/api/pilot/metrics")
def metrics(period: Literal["today", "week", "month"] = "today", anchor_date: str | None = None, user=Depends(require_user)):
    with db.read() as conn:
        return ok(metrics_for_user(conn, user, period, anchor_date))


@router.get("/api/pilot/legacy/goalsheets")
def legacy_goalsheets(from_date: str | None = Query(None, alias="from"), to: str | None = None,
                     cursor: str | None = None, limit: int = Query(25, ge=1, le=100), user=Depends(require_user)):
    offset = page_offset(cursor)
    if from_date is not None:
        valid_day(from_date)
    if to is not None:
        valid_day(to)
    if from_date and to and from_date > to:
        fail(422, "invalid_date_range")
    with db.read() as conn:
        if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='goalsheet_entries'").fetchone():
            rows = []
        else:
            rows = conn.execute("SELECT * FROM goalsheet_entries WHERE user_id=? AND (? IS NULL OR entry_date>=?) AND (? IS NULL OR entry_date<=?) ORDER BY entry_date DESC,id DESC LIMIT ? OFFSET ?",
                                (user["id"], from_date, from_date, to, to, limit + 1, offset)).fetchall()
        result = paginate([dict(row) for row in rows], offset, limit)
        entries = []
        for row in result["items"]:
            try:
                row["payload"] = json.loads(row.pop("payload_json"))
            except (ValueError, TypeError):
                row.pop("payload_json", None)
                row["payload"] = None
            entries.append(row)
        return ok({"source": "legacy_daily_summary", "included_in_pilot_metrics": False, "entries": entries, "next_cursor": result["next_cursor"]})
