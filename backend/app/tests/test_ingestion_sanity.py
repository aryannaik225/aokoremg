"""Sanity checks that ingested actuals/forecasts cover the expected delivery-day
window with no major gaps. Run against an already-ingested DB (not a fixture),
so these are skipped if the tables are empty."""

from datetime import timedelta

import pytest
from sqlalchemy import func, select

from app.config import settings
from app.db.models import ActualGeneration, ForecastGeneration
from app.db.session import SessionLocal

EXPECTED_SETTLEMENT_PERIODS = (
    (settings.delivery_window_end - settings.delivery_window_start).days + 1
) * 48


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()


def _skip_if_empty(db, model):
    count = db.scalar(select(func.count()).select_from(model))
    if not count:
        pytest.skip(f"{model.__tablename__} is empty; run ingestion first")
    return count


def test_actuals_cover_full_delivery_window(db):
    count = _skip_if_empty(db, ActualGeneration)
    min_start, max_start = db.execute(
        select(func.min(ActualGeneration.start_time), func.max(ActualGeneration.start_time))
    ).one()
    assert min_start.date() <= settings.delivery_window_start
    assert max_start.date() >= settings.delivery_window_end
    assert count >= EXPECTED_SETTLEMENT_PERIODS * 0.95


def test_forecasts_cover_full_delivery_window(db):
    _skip_if_empty(db, ForecastGeneration)
    distinct_start_times = db.scalar(
        select(func.count(func.distinct(ForecastGeneration.start_time)))
    )
    assert distinct_start_times > 0

    window_start = settings.delivery_window_start
    window_end = settings.delivery_window_end + timedelta(days=1)
    min_start, max_start = db.execute(
        select(func.min(ForecastGeneration.start_time), func.max(ForecastGeneration.start_time))
    ).one()
    assert min_start.date() <= window_start
    assert max_start.date() >= window_end - timedelta(days=1)


def test_forecasts_have_multiple_revisions(db):
    """Confirms WINDFOR revisions were actually captured, not just one row per startTime."""
    _skip_if_empty(db, ForecastGeneration)
    total = db.scalar(select(func.count()).select_from(ForecastGeneration))
    distinct_start_times = db.scalar(
        select(func.count(func.distinct(ForecastGeneration.start_time)))
    )
    assert total > distinct_start_times
