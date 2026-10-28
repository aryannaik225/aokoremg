from datetime import datetime

from pydantic import BaseModel


class FuelHHRecord(BaseModel):
    """A single FUELHH actual-generation row (filtered to fuelType=WIND)."""

    dataset: str
    publishTime: datetime
    startTime: datetime
    settlementDate: str
    settlementPeriod: int
    fuelType: str
    generation: float


class WindForRecord(BaseModel):
    """A single WINDFOR forecast row. Multiple rows share startTime across revisions."""

    dataset: str
    publishTime: datetime
    startTime: datetime
    generation: float
