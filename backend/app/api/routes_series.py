from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.domain.series import build_day_series

router = APIRouter(prefix="/api/days", tags=["series"])


@router.get("/{delivery_date}/series")
def get_day_series(delivery_date: date, db: Session = Depends(get_db)) -> dict:
    """Half-hourly decision-time forecast vs actual, plus per-period error, for one delivery day."""
    if not (settings.delivery_window_start <= delivery_date <= settings.delivery_window_end):
        raise HTTPException(
            status_code=400,
            detail=(
                f"delivery_date must be between {settings.delivery_window_start.isoformat()} "
                f"and {settings.delivery_window_end.isoformat()}"
            ),
        )

    rows = build_day_series(db, delivery_date)

    return {
        "date": delivery_date.isoformat(),
        "periods": [
            {
                "start_time": row.start_time.isoformat(),
                "forecast": row.forecast,
                "actual": row.actual,
                "error": row.error,
            }
            for row in rows
        ],
    }
