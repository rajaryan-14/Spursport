from collections import defaultdict
from math import exp, factorial

import numpy as np
import pandas as pd


BASE_ELO = 1500.0


def build_elo_ratings(results: pd.DataFrame, k_factor: float = 24.0) -> dict[str, float]:
    ratings: dict[str, float] = defaultdict(lambda: BASE_ELO)
    for match in results.sort_values("date").itertuples():
        home, away = ratings[match.home_team], ratings[match.away_team]
        expected_home = 1 / (1 + 10 ** ((away - home) / 400))
        actual_home = 1.0 if match.home_goals > match.away_goals else 0.0 if match.home_goals < match.away_goals else 0.5
        margin = max(1.0, abs(match.home_goals - match.away_goals))
        update = k_factor * (1 + 0.15 * (margin - 1)) * (actual_home - expected_home)
        ratings[match.home_team] += update
        ratings[match.away_team] -= update
    return dict(ratings)


def estimate_goal_rates(results: pd.DataFrame, home: str, away: str, ratings: dict[str, float]) -> tuple[float, float]:
    """Estimate goals using smoothed team scoring plus Elo strength and home advantage."""
    league_home = results.home_goals.mean()
    league_away = results.away_goals.mean()
    home_matches = results[results.home_team == home]
    away_matches = results[results.away_team == away]
    home_attack = (home_matches.home_goals.mean() if not home_matches.empty else league_home)
    away_defence = (away_matches.home_goals.mean() if not away_matches.empty else league_home)
    away_attack = (away_matches.away_goals.mean() if not away_matches.empty else league_away)
    home_defence = (home_matches.away_goals.mean() if not home_matches.empty else league_away)
    home_strength = (ratings.get(home, BASE_ELO) - BASE_ELO) / 1200
    away_strength = (ratings.get(away, BASE_ELO) - BASE_ELO) / 1200
    home_rate = max(0.15, (home_attack + away_defence) / 2 + 0.22 + home_strength - away_strength * 0.35)
    away_rate = max(0.15, (away_attack + home_defence) / 2 + away_strength - home_strength * 0.25)
    return home_rate, away_rate


def outcome_probabilities(home_rate: float, away_rate: float, max_goals: int = 10) -> dict[str, float]:
    distribution = np.array([[exp(-home_rate) * home_rate**h / factorial(h) * exp(-away_rate) * away_rate**a / factorial(a)
                               for a in range(max_goals + 1)] for h in range(max_goals + 1)])
    distribution /= distribution.sum()
    return {"home_win": float(np.tril(distribution, -1).sum()), "draw": float(np.trace(distribution)), "away_win": float(np.triu(distribution, 1).sum())}


def simulate_league(results: pd.DataFrame, fixtures: pd.DataFrame, n_simulations: int = 10000, seed: int | None = None) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    teams = sorted(set(results.home_team) | set(results.away_team) | set(fixtures.home_team) | set(fixtures.away_team))
    base_points = {team: 0 for team in teams}
    for match in results.itertuples():
        if match.home_goals > match.away_goals: base_points[match.home_team] += 3
        elif match.home_goals < match.away_goals: base_points[match.away_team] += 3
        else: base_points[match.home_team] += 1; base_points[match.away_team] += 1
    ratings = build_elo_ratings(results)
    positions = {team: [] for team in teams}
    for _ in range(n_simulations):
        points = base_points.copy()
        for fixture in fixtures.itertuples():
            home_rate, away_rate = estimate_goal_rates(results, fixture.home_team, fixture.away_team, ratings)
            hg, ag = rng.poisson(home_rate), rng.poisson(away_rate)
            if hg > ag: points[fixture.home_team] += 3
            elif hg < ag: points[fixture.away_team] += 3
            else: points[fixture.home_team] += 1; points[fixture.away_team] += 1
        ordered = sorted(teams, key=lambda team: (-points[team], rng.random()))
        for position, team in enumerate(ordered, start=1): positions[team].append(position)
    return pd.DataFrame([{"team": team, "finish_position": round(float(np.mean(values)), 2), "top_4_probability": round(float(np.mean(np.array(values) <= 4)), 4), "top_6_probability": round(float(np.mean(np.array(values) <= 6)), 4)} for team, values in positions.items()])
