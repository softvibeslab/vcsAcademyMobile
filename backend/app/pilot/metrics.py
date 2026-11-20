"""Money is integer cents. Ratios round only at the response boundary."""
from decimal import Decimal, ROUND_HALF_UP


def effective_q(entry):
    return entry.get("record_status", "active") == "active" and (
        entry["tour_kind"] == "q" or (
            entry["tour_kind"] in ("ct", "nq") and entry.get("sale_status") == "sold"))


def totals(entries):
    active = [dict(e) for e in entries if e.get("record_status", "active") == "active"]
    real = [e for e in active if e["tour_kind"] != "no_tour"]
    sold = [e for e in real if e.get("sale_status") == "sold"]
    return {
        "records": len(active), "tours": len(real),
        "qualified_tours": sum(effective_q(e) for e in real),
        "sales": len(sold),
        "net_volume_cents": sum(e.get("net_volume_cents", 0) for e in sold),
        "no_tour": sum(e["tour_kind"] == "no_tour" for e in active),
        "types": {kind: sum(e["tour_kind"] == kind for e in active)
                  for kind in ("q", "ct", "nq", "no_tour")},
        "channels": {channel: sum(e.get("channel") == channel for e in real)
                     for channel in ("agency", "member")},
    }


def percent(numerator, denominator):
    return Decimal(numerator) * 100 / Decimal(denominator) if denominator else None


def percent_text(value):
    if value is None:
        return None
    value = value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"{abs(value) if value == 0 else value:.2f}"


def cents_ratio(numerator, denominator):
    return int((Decimal(numerator) / denominator).quantize(Decimal(1), rounding=ROUND_HALF_UP)) if denominator else None


def calculate_metrics(activity_entries, monthly_entries=None, goal=None):
    activity = totals(activity_entries)
    monthly = totals(monthly_entries if monthly_entries is not None else activity_entries)
    return calculate_from_totals(activity, monthly, goal)


def calculate_from_totals(activity, monthly, goal=None):
    """Apply canonical formulas to integer aggregates from either domain or SQL."""
    budget = goal.get("budget_volume_cents") if goal else None
    target = goal.get("target_close_bps") if goal else None
    monthly_closing = percent(monthly["sales"], monthly["qualified_tours"])
    return {
        "activity_totals": activity, "monthly_totals": monthly, "goal": goal,
        "kpis": {
            "closing_percent": percent_text(percent(activity["sales"], activity["qualified_tours"])),
            "vpg_cents": cents_ratio(activity["net_volume_cents"], activity["qualified_tours"]),
            "average_ticket_cents": cents_ratio(activity["net_volume_cents"], activity["sales"]),
            "budget_attainment_percent": percent_text(percent(monthly["net_volume_cents"], budget)),
            "budget_difference_cents": monthly["net_volume_cents"] - budget if budget else None,
            "closing_difference_pp": percent_text(monthly_closing - Decimal(target) / 100)
                if monthly_closing is not None and target is not None else None,
        },
        "availability": {"has_records": bool(activity["records"]), "has_goal": bool(budget),
                         "has_closing_target": target is not None},
    }
