import math

from app.domain.metrics import compute_metrics


def test_known_numeric_example():
    # forecast, actual
    pairs = [(110.0, 100.0), (90.0, 100.0), (100.0, 100.0), (120.0, 100.0)]
    # errors: +10, -10, 0, +20 -> abs: 10,10,0,20 -> mae = 10
    m = compute_metrics(pairs)
    assert math.isclose(m.mae, 10.0)
    assert math.isclose(m.rmse, math.sqrt((100 + 100 + 0 + 400) / 4))
    assert math.isclose(m.bias, 5.0)  # (10 - 10 + 0 + 20) / 4
    assert math.isclose(m.n_mae, 10.0 / 100.0)
    assert math.isclose(m.mape, (10 + 10 + 0 + 20) / 4)  # all actuals are 100
    assert m.count == 4


def test_empty_pairs_returns_zeroed_metrics():
    m = compute_metrics([])
    assert m.mae == 0.0
    assert m.rmse == 0.0
    assert m.bias == 0.0
    assert m.n_mae is None
    assert m.mape is None
    assert m.count == 0


def test_zero_mean_actual_gives_none_n_mae_and_mape():
    m = compute_metrics([(5.0, 0.0), (-5.0, 0.0)])
    assert m.n_mae is None
    assert m.mape is None
    assert math.isclose(m.mae, 5.0)
    assert math.isclose(m.bias, 0.0)


def test_perfect_forecast_has_zero_error():
    m = compute_metrics([(100.0, 100.0), (200.0, 200.0)])
    assert m.mae == 0.0
    assert m.rmse == 0.0
    assert m.bias == 0.0
    assert m.n_mae == 0.0
    assert m.mape == 0.0
