from dataclasses import asdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.domain.metrics import compute_metrics
from app.domain.series import build_day_series

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("")
def get_metrics(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
) -> dict:
    """Aggregated error metrics (MAE/RMSE/bias/nMAE/MAPE) over a delivery-day
    range, plus a per-day breakdown. Defaults to the full Jan 2026 decision
    window (delivery days Jan 2 - Feb 1, 2026)."""
    start = from_date or settings.delivery_window_start
    end = to_date or settings.delivery_window_end

    if start > end:
        raise HTTPException(status_code=400, detail="'from' must not be after 'to'")
    if start < settings.delivery_window_start or end > settings.delivery_window_end:
        raise HTTPException(
            status_code=400,
            detail=(
                f"range must fall within the in-scope delivery window "
                f"{settings.delivery_window_start.isoformat()} - {settings.delivery_window_end.isoformat()}"
            ),
        )

    daily = []
    all_pairs: list[tuple[float, float]] = []

    d = start
    while d <= end:
        rows = build_day_series(db, d)
        pairs = [(row.forecast, row.actual) for row in rows if row.forecast is not None and row.actual is not None]
        day_metrics = compute_metrics(pairs)
        daily.append({"date": d.isoformat(), **asdict(day_metrics)})
        all_pairs.extend(pairs)
        d += timedelta(days=1)

    aggregate = compute_metrics(all_pairs)

    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "aggregate": asdict(aggregate),
        "daily": daily,
    }
