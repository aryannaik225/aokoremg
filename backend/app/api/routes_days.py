from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import ActualGeneration
from app.db.session import get_db
from app.domain.decision_forecast import get_decision_time_forecast_for_day
from app.domain.series import SETTLEMENT_PERIODS_PER_DAY

router = APIRouter(prefix="/api/days", tags=["days"])


@router.get("")
def list_days(db: Session = Depends(get_db)) -> list[dict]:
    """In-scope delivery days (Jan 2 - Feb 1, 2026) with data-availability flags."""
    days = []
    d = settings.delivery_window_start
    while d <= settings.delivery_window_end:
        window_start = datetime.combine(d, time.min)
        window_end = window_start + timedelta(days=1)

        actual_count = db.execute(
            select(func.count())
            .select_from(ActualGeneration)
            .where(ActualGeneration.start_time >= window_start, ActualGeneration.start_time < window_end)
        ).scalar_one()

        forecast_periods = len(get_decision_time_forecast_for_day(db, d))

        days.append(
            {
                "date": d.isoformat(),
                "actual_periods_available": actual_count,
                "forecast_periods_available": forecast_periods,
                "settlement_periods_expected": SETTLEMENT_PERIODS_PER_DAY,
                "has_complete_actuals": actual_count == SETTLEMENT_PERIODS_PER_DAY,
                "has_any_forecast": forecast_periods > 0,
            }
        )
        d += timedelta(days=1)

    return days
