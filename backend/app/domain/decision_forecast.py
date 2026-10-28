"""Decision-time forecast selection.

For a given delivery day, the day-ahead buying team only ever saw the WINDFOR
revisions published before their decision-cutoff on D-1. This module picks,
per settlement period, the single forecast revision that was "latest as of"
that cutoff -- not simply the latest revision overall.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import ForecastGeneration

UK_TZ = ZoneInfo("Europe/London")
UTC_TZ = ZoneInfo("UTC")


@dataclass(frozen=True)
class ForecastRevision:
    start_time: datetime
    publish_time: datetime
    generation: float


def decision_cutoff_utc(delivery_date: date) -> datetime:
    """The decision-cutoff instant for a delivery day, as a naive UTC
    datetime (matching how Elexon timestamps are stored in the DB).

    Decisions for delivery day D are made on D-1, with the gate closing at
    settings.decision_cutoff_time UK local time.
    """
    decision_day = delivery_date - timedelta(days=1)
    cutoff_local = datetime.combine(decision_day, settings.decision_cutoff_time, tzinfo=UK_TZ)
    return cutoff_local.astimezone(UTC_TZ).replace(tzinfo=None)


def select_decision_time_forecast(
    revisions: list[ForecastRevision], cutoff_utc: datetime
) -> dict[datetime, float]:
    """Given all forecast revisions touching a delivery day, pick for each
    settlement period (start_time) the generation value from the revision
    with the latest publish_time that is <= cutoff_utc. Revisions published
    after the cutoff are ignored even if they would otherwise be "the
    latest" for that settlement period.
    """
    latest: dict[datetime, tuple[datetime, float]] = {}
    for rev in revisions:
        if rev.publish_time > cutoff_utc:
            continue
        current = latest.get(rev.start_time)
        if current is None or rev.publish_time > current[0]:
            latest[rev.start_time] = (rev.publish_time, rev.generation)
    return {start: gen for start, (_, gen) in latest.items()}


def get_decision_time_forecast_for_day(db: Session, delivery_date: date) -> dict[datetime, float]:
    """Query + select in one step: returns {settlement_period_start_time: generation}
    for the decision-time forecast of a single delivery day."""
    window_start = datetime.combine(delivery_date, time.min)
    window_end = window_start + timedelta(days=1)
    cutoff = decision_cutoff_utc(delivery_date)

    rows = (
        db.execute(
            select(ForecastGeneration).where(
                ForecastGeneration.start_time >= window_start,
                ForecastGeneration.start_time < window_end,
            )
        )
        .scalars()
        .all()
    )
    revisions = [ForecastRevision(r.start_time, r.publish_time, r.generation) for r in rows]
    return select_decision_time_forecast(revisions, cutoff)
