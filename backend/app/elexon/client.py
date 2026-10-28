from datetime import date, datetime

import httpx
from pydantic import TypeAdapter

from app.config import settings
from app.elexon.schemas import FuelHHRecord, WindForRecord

_fuelhh_adapter = TypeAdapter(list[FuelHHRecord])
_windfor_adapter = TypeAdapter(list[WindForRecord])


def fetch_fuelhh_wind(settlement_date_from: date, settlement_date_to: date) -> list[FuelHHRecord]:
    """Fetch FUELHH actual generation rows for WIND over an inclusive settlement-date range."""
    url = f"{settings.elexon_base_url}/datasets/FUELHH/stream"
    params = {
        "settlementDateFrom": settlement_date_from.isoformat(),
        "settlementDateTo": settlement_date_to.isoformat(),
        "fuelType": "WIND",
    }
    response = httpx.get(url, params=params, timeout=30.0)
    response.raise_for_status()
    return _fuelhh_adapter.validate_python(response.json())


def fetch_windfor(publish_from: datetime, publish_to: datetime) -> list[WindForRecord]:
    """Fetch all WINDFOR forecast revisions published within an inclusive UTC datetime range."""
    url = f"{settings.elexon_base_url}/datasets/WINDFOR/stream"
    params = {
        "publishDateTimeFrom": publish_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "publishDateTimeTo": publish_to.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    response = httpx.get(url, params=params, timeout=30.0)
    response.raise_for_status()
    return _windfor_adapter.validate_python(response.json())
