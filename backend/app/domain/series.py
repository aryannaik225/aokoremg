"""Per-settlement-period forecast-vs-actual series for a single delivery day.

WINDFOR is natively hourly (start_time always lands on :00) while FUELHH
actuals are half-hourly. To produce a full 48-period series we forward-fill
each hourly decision-time forecast value onto the following :30 period
(i.e. the forecast for HH:30 is the same as the decision-time forecast for
HH:00) rather than dropping the :30 periods or treating them as no-data.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import ActualGeneration
from app.domain.decision_forecast import get_decision_time_forecast_for_day

SETTLEMENT_PERIODS_PER_DAY = 48
SETTLEMENT_PERIOD_MINUTES = 30


@dataclass(frozen=True)
class SettlementPeriodRow:
    start_time: datetime
    forecast: float | None
    actual: float | None
    error: float | None  # forecast - actual, only when both are present


def _floor_to_hour(dt: datetime) -> datetime:
    return dt.replace(minute=0, second=0, microsecond=0)


def build_day_series(db: Session, delivery_date: date) -> list[SettlementPeriodRow]:
    """Returns all 48 settlement periods for the delivery day, pairing each
    period's actual generation with the decision-time forecast in force for
    that period (forward-filled from the hourly WINDFOR grid). Periods with
    no actual and/or no pre-cutoff forecast are returned with None rather
    than omitted, so gaps are visible to callers.
    """
    window_start = datetime.combine(delivery_date, time.min)
    window_end = window_start + timedelta(days=1)

    actual_rows = (
        db.execute(
            select(ActualGeneration).where(
                ActualGeneration.start_time >= window_start,
                ActualGeneration.start_time < window_end,
            )
        )
        .scalars()
        .all()
    )
    actual_by_start = {row.start_time: row.generation for row in actual_rows}

    hourly_forecast = get_decision_time_forecast_for_day(db, delivery_date)

    rows: list[SettlementPeriodRow] = []
    for i in range(SETTLEMENT_PERIODS_PER_DAY):
        start = window_start + timedelta(minutes=i * SETTLEMENT_PERIOD_MINUTES)
        actual = actual_by_start.get(start)
        forecast = hourly_forecast.get(_floor_to_hour(start))
        error = (forecast - actual) if (forecast is not None and actual is not None) else None
        rows.append(SettlementPeriodRow(start_time=start, forecast=forecast, actual=actual, error=error))

    return rows
