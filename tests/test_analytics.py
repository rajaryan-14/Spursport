import pandas as pd

from src.spurscope.analytics import outcome_probabilities, simulate_league
from src.spurscope.data import load_results


def test_outcome_probabilities_sum_to_one():
    probabilities = outcome_probabilities(1.5, 1.0)
    assert abs(sum(probabilities.values()) - 1) < 1e-9


def test_simulation_is_reproducible():
    results = load_results("data/sample_results.csv")
    fixtures = pd.DataFrame([{"home_team": "Tottenham", "away_team": "Arsenal"}])
    first = simulate_league(results, fixtures, n_simulations=100, seed=7)
    second = simulate_league(results, fixtures, n_simulations=100, seed=7)
    pd.testing.assert_frame_equal(first, second)
