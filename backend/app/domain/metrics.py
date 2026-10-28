"""Forecast-error metrics over paired (decision_time_forecast, actual) values.

error = forecast - actual, per CLAUDE.md's metric definition.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class ErrorMetrics:
    mae: float
    rmse: float
    bias: float
    n_mae: float | None  # MAE / mean(actual); None if mean(actual) == 0
    mape: float | None  # secondary figure; None if every actual is 0
    count: int


def compute_metrics(pairs: list[tuple[float, float]]) -> ErrorMetrics:
    """pairs: list of (forecast_generation, actual_generation) in MW."""
    if not pairs:
        return ErrorMetrics(mae=0.0, rmse=0.0, bias=0.0, n_mae=None, mape=None, count=0)

    n = len(pairs)
    errors = [forecast - actual for forecast, actual in pairs]

    mae = sum(abs(e) for e in errors) / n
    rmse = math.sqrt(sum(e * e for e in errors) / n)
    bias = sum(errors) / n

    mean_actual = sum(actual for _, actual in pairs) / n
    n_mae = mae / mean_actual if mean_actual != 0 else None

    mape_terms = [abs(e) / actual for e, (_, actual) in zip(errors, pairs) if actual != 0]
    mape = (sum(mape_terms) / len(mape_terms)) * 100 if mape_terms else None

    return ErrorMetrics(mae=mae, rmse=rmse, bias=bias, n_mae=n_mae, mape=mape, count=n)
