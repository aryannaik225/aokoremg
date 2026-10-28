"""Integration tests hitting the Phase 4 API endpoints against the
live-ingested SQLite data (same DB the sanity tests in
test_ingestion_sanity.py use) via FastAPI's TestClient."""

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def test_list_days_covers_full_window():
    resp = client.get("/api/days")
    assert resp.status_code == 200
    days = resp.json()

    expected_count = (settings.delivery_window_end - settings.delivery_window_start).days + 1
    assert len(days) == expected_count
    assert days[0]["date"] == settings.delivery_window_start.isoformat()
    assert days[-1]["date"] == settings.delivery_window_end.isoformat()
    assert all(d["has_complete_actuals"] for d in days)
    assert all(d["has_any_forecast"] for d in days)


def test_series_for_one_day_has_48_periods_and_forward_filled_forecast():
    resp = client.get(f"/api/days/{settings.delivery_window_start.isoformat()}/series")
    assert resp.status_code == 200
    body = resp.json()

    periods = body["periods"]
    assert len(periods) == 48
    assert all(p["actual"] is not None for p in periods)

    # every :30 period should carry the same forecast as its preceding :00 period
    on_hour = {p["start_time"]: p["forecast"] for p in periods if p["start_time"].endswith(":00")}
    for p in periods:
        if p["start_time"].endswith(":30"):
            hour_key = p["start_time"].replace(":30", ":00")
            assert p["forecast"] == on_hour[hour_key]


def test_series_rejects_out_of_scope_date():
    resp = client.get("/api/days/2025-12-31/series")
    assert resp.status_code == 400


def test_metrics_default_window_matches_full_range():
    resp = client.get("/api/metrics")
    assert resp.status_code == 200
    body = resp.json()

    assert body["from"] == settings.delivery_window_start.isoformat()
    assert body["to"] == settings.delivery_window_end.isoformat()
    assert body["aggregate"]["count"] > 0
    assert len(body["daily"]) == (settings.delivery_window_end - settings.delivery_window_start).days + 1


def test_metrics_rejects_range_outside_scope():
    resp = client.get("/api/metrics?from=2025-01-01&to=2025-01-31")
    assert resp.status_code == 400


def test_metrics_single_day_range():
    d = settings.delivery_window_start.isoformat()
    resp = client.get(f"/api/metrics?from={d}&to={d}")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["daily"]) == 1
    assert body["daily"][0]["date"] == d
