"""Fetch Elexon FUELHH (actuals) and WINDFOR (forecasts) for the in-scope
delivery-day window and upsert them into SQLite. Safe to re-run (idempotent).
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import ActualGeneration, ForecastGeneration
from app.db.session import SessionLocal, init_db
from app.elexon.client import fetch_fuelhh_wind, fetch_windfor

logger = logging.getLogger(__name__)

# How far before the delivery window a WINDFOR forecast could plausibly have
# been published and still be relevant. 14 days comfortably covers Elexon's
# forecast horizon; anything issued earlier wouldn't be the "latest as-of
# cutoff" pick anyway since later revisions supersede it.
WINDFOR_PUBLISH_LOOKBACK = timedelta(days=14)

# SQLite's default build caps bound parameters per statement at 999. Chunk
# bulk upserts so row-count * column-count never approaches that limit.
UPSERT_CHUNK_SIZE = 200


def _upsert_actuals(db: Session, rows: list) -> int:
    if not rows:
        return 0
    values = [{"start_time": r.startTime, "generation": r.generation} for r in rows]
    for i in range(0, len(values), UPSERT_CHUNK_SIZE):
        chunk = values[i : i + UPSERT_CHUNK_SIZE]
        stmt = sqlite_insert(ActualGeneration).values(chunk)
        stmt = stmt.on_conflict_do_update(
            index_elements=["start_time"],
            set_={"generation": stmt.excluded.generation},
        )
        db.execute(stmt)
    db.commit()
    return len(values)


def _upsert_forecasts(db: Session, rows: list) -> int:
    if not rows:
        return 0
    values = [
        {"start_time": r.startTime, "publish_time": r.publishTime, "generation": r.generation}
        for r in rows
    ]
    for i in range(0, len(values), UPSERT_CHUNK_SIZE):
        chunk = values[i : i + UPSERT_CHUNK_SIZE]
        stmt = sqlite_insert(ForecastGeneration).values(chunk)
        stmt = stmt.on_conflict_do_update(
            index_elements=["start_time", "publish_time"],
            set_={"generation": stmt.excluded.generation},
        )
        db.execute(stmt)
    db.commit()
    return len(values)


def ingest_actuals(db: Session) -> int:
    """Fetch FUELHH WIND actuals for the delivery-day window and upsert them."""
    rows = fetch_fuelhh_wind(settings.delivery_window_start, settings.delivery_window_end)
    inserted = _upsert_actuals(db, rows)
    logger.info("Fetched %d FUELHH rows, upserted %d", len(rows), inserted)
    return inserted


def ingest_forecasts(db: Session) -> int:
    """Fetch WINDFOR revisions (across a wide publish-time lookback) and upsert
    only those rows whose startTime falls within the delivery-day window."""
    publish_from = datetime.combine(
        settings.delivery_window_start, datetime.min.time(), tzinfo=timezone.utc
    ) - WINDFOR_PUBLISH_LOOKBACK
    publish_to = datetime.combine(
        settings.delivery_window_end, datetime.min.time(), tzinfo=timezone.utc
    ) + timedelta(days=1)

    rows = fetch_windfor(publish_from, publish_to)

    window_start = datetime.combine(
        settings.delivery_window_start, datetime.min.time(), tzinfo=timezone.utc
    )
    window_end = datetime.combine(
        settings.delivery_window_end, datetime.min.time(), tzinfo=timezone.utc
    ) + timedelta(days=1)
    in_window = [r for r in rows if window_start <= r.startTime < window_end]

    inserted = _upsert_forecasts(db, in_window)
    logger.info(
        "Fetched %d WINDFOR rows (publishTime %s to %s), %d within delivery-day window, upserted %d",
        len(rows), publish_from, publish_to, len(in_window), inserted,
    )
    return inserted


def run_ingestion() -> None:
    logging.basicConfig(level=logging.INFO)
    init_db()
    db = SessionLocal()
    try:
        ingest_actuals(db)
        ingest_forecasts(db)
    finally:
        db.close()


if __name__ == "__main__":
    run_ingestion()
