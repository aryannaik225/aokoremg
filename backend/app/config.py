from datetime import date, time

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Env-driven settings for the Wind Forecast Accuracy backend."""

    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    elexon_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"

    # Decision-time cutoff: a WINDFOR record is "available at decision time"
    # for delivery day D only if its publishTime <= 11:00 UK time on D-1.
    # This is a deliberate, documented choice (not end-of-day D-1) per
    # CLAUDE.md Phase 0: 11:00 UK time represents the practical day-ahead
    # gate-closure cutoff for the buying team.
    decision_cutoff_time: time = time(11, 0)

    # In-scope delivery-day window (inclusive). Decisions are made in
    # January 2026 (D-1 = Jan 1-31), so delivery days run Jan 2 - Feb 1 2026.
    delivery_window_start: date = date(2026, 1, 2)
    delivery_window_end: date = date(2026, 2, 1)

    db_path: str = "./data/gridbricks.db"

    frontend_origin: str = "http://localhost:5173"


settings = Settings()
