from pathlib import Path

import pandas as pd
import streamlit as st

from src.spurscope.analytics import (
    build_elo_ratings,
    estimate_goal_rates,
    outcome_probabilities,
    simulate_league,
)
from src.spurscope.data import load_results


ROOT = Path(__file__).parent
RESULTS_PATH = ROOT / "data" / "sample_results.csv"

st.set_page_config(page_title="SPURSCOPE", page_icon="⚽", layout="wide")
st.title("⚽ SPURSCOPE")
st.caption("Predict • Simulate • Explain — MVP")

results = load_results(RESULTS_PATH)
teams = sorted(set(results.home_team) | set(results.away_team))
ratings = build_elo_ratings(results)

left, right = st.columns(2)
with left:
    st.subheader("Match predictor")
    home = st.selectbox("Home team", teams, index=teams.index("Tottenham") if "Tottenham" in teams else 0)
    away_options = [team for team in teams if team != home]
    away = st.selectbox("Away team", away_options, index=away_options.index("Arsenal") if "Arsenal" in away_options else 0)
    home_rate, away_rate = estimate_goal_rates(results, home, away, ratings)
    probs = outcome_probabilities(home_rate, away_rate)
    st.metric("Expected score", f"{home_rate:.2f} – {away_rate:.2f}")
    st.write({"Home win": f"{probs['home_win']:.1%}", "Draw": f"{probs['draw']:.1%}", "Away win": f"{probs['away_win']:.1%}"})

with right:
    st.subheader("Elo ratings")
    elo_table = pd.DataFrame({"Team": list(ratings), "Elo": list(ratings.values())}).sort_values("Elo", ascending=False)
    st.dataframe(elo_table, hide_index=True, use_container_width=True)

st.subheader("Where will Spurs finish? (demo simulation)")
future = pd.DataFrame([
    {"home_team": "Tottenham", "away_team": "Arsenal"},
    {"home_team": "Liverpool", "away_team": "Tottenham"},
    {"home_team": "Tottenham", "away_team": "Chelsea"},
    {"home_team": "Manchester City", "away_team": "Tottenham"},
])
simulations = simulate_league(results, future, n_simulations=5000, seed=42)
spurs = simulations[simulations.team == "Tottenham"].sort_values("finish_position")
st.dataframe(spurs, hide_index=True, use_container_width=True)
st.info("This dashboard uses demo data and is intended to validate the product flow. Live, complete data comes next.")
