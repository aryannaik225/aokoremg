from datetime import date, datetime

from app.domain.decision_forecast import (
    ForecastRevision,
    decision_cutoff_utc,
    select_decision_time_forecast,
)


def test_decision_cutoff_is_1100_uk_on_d_minus_1_in_utc():
    # January: UK is on GMT (UTC+0), so 11:00 UK == 11:00 UTC.
    cutoff = decision_cutoff_utc(date(2026, 1, 15))
    assert cutoff == datetime(2026, 1, 14, 11, 0)


def test_picks_latest_revision_at_or_before_cutoff_not_latest_overall():
    start_time = datetime(2026, 1, 15, 12, 0)
    cutoff = datetime(2026, 1, 14, 11, 0)
    revisions = [
        ForecastRevision(start_time, datetime(2026, 1, 13, 9, 0), 1000.0),
        ForecastRevision(start_time, datetime(2026, 1, 14, 9, 0), 1100.0),  # latest before cutoff
        ForecastRevision(start_time, datetime(2026, 1, 14, 12, 0), 9999.0),  # after cutoff: must be ignored
    ]
    result = select_decision_time_forecast(revisions, cutoff)
    assert result == {start_time: 1100.0}


def test_exact_cutoff_timestamp_is_included():
    start_time = datetime(2026, 1, 15, 12, 0)
    cutoff = datetime(2026, 1, 14, 11, 0)
    revisions = [ForecastRevision(start_time, cutoff, 500.0)]
    assert select_decision_time_forecast(revisions, cutoff) == {start_time: 500.0}


def test_settlement_period_with_no_revision_before_cutoff_is_omitted():
    start_time = datetime(2026, 1, 15, 12, 0)
    cutoff = datetime(2026, 1, 14, 11, 0)
    revisions = [ForecastRevision(start_time, datetime(2026, 1, 14, 12, 0), 9999.0)]
    assert select_decision_time_forecast(revisions, cutoff) == {}


def test_each_settlement_period_resolved_independently():
    sp1 = datetime(2026, 1, 15, 0, 0)
    sp2 = datetime(2026, 1, 15, 0, 30)
    cutoff = datetime(2026, 1, 14, 11, 0)
    revisions = [
        ForecastRevision(sp1, datetime(2026, 1, 10, 9, 0), 100.0),
        ForecastRevision(sp2, datetime(2026, 1, 14, 10, 0), 200.0),
    ]
    assert select_decision_time_forecast(revisions, cutoff) == {sp1: 100.0, sp2: 200.0}
