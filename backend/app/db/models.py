from datetime import datetime

from sqlalchemy import DateTime, Float
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ActualGeneration(Base):
    """Metered wind generation for a settlement period (Elexon FUELHH, fuelType=WIND)."""

    __tablename__ = "actual_generation"

    start_time: Mapped[datetime] = mapped_column(DateTime, primary_key=True)
    generation: Mapped[float] = mapped_column(Float, nullable=False)


class ForecastGeneration(Base):
    """A WINDFOR forecast revision for a settlement period.

    Multiple rows can share start_time with different publish_time values
    as the forecast gets revised; (start_time, publish_time) is the key.
    """

    __tablename__ = "forecast_generation"

    start_time: Mapped[datetime] = mapped_column(DateTime, primary_key=True)
    publish_time: Mapped[datetime] = mapped_column(DateTime, primary_key=True)
    generation: Mapped[float] = mapped_column(Float, nullable=False)
