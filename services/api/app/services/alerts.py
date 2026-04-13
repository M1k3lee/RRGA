from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models import AlertEvent, AlertRule, Watchlist


def create_watchlist_with_rule(
    session: Session,
    *,
    owner_id: str,
    label: str | None,
    target_type: str,
    target_value: str,
    rule_type: str,
    delivery_channel: str,
    threshold: float | None,
    filters: dict,
) -> Watchlist:
    watchlist = Watchlist(
        owner_id=owner_id,
        label=label,
        target_type=target_type,
        target_value=target_value,
        filters_json=filters,
    )
    session.add(watchlist)
    session.flush()
    session.add(
        AlertRule(
            watchlist_id=watchlist.id,
            rule_type=rule_type,
            delivery_channel=delivery_channel,
            threshold=threshold,
            enabled=True,
        )
    )
    session.commit()
    return watchlist


def create_test_alert(session: Session, *, title: str, payload: dict) -> AlertEvent:
    event = AlertEvent(
        title=title,
        payload_json=payload,
        status="queued",
    )
    session.add(event)
    session.commit()
    return event
