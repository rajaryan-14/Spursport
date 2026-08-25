# SPURSCOPE

Predict • Simulate • Explain

An extensible Tottenham Hotspur / Premier League analytics MVP. The first version includes:

- Elo ratings calculated from match results
- Poisson-based score and win/draw/loss probabilities
- Monte Carlo league-position simulation
- A Streamlit dashboard

The checked-in CSV is deliberately a small demo dataset. Replace it with a complete, licensed historical dataset before using the outputs as football analysis.

## Run locally

```powershell
npm install
npm run dev
```

The web dashboard is the Next.js app in `app/` and is designed for Vercel. The Python code in `src/` is retained for model development and data preparation.

Run the tests with:

```powershell
py -m pytest
```

## Data format

The results CSV must contain `date`, `home_team`, `away_team`, `home_goals`, and `away_goals`. A future-fixtures CSV should contain `date`, `home_team`, and `away_team`.

## Next milestones

1. Load complete historical PL results and current fixtures.
2. Add xG and opponent-strength features.
3. Calibrate predictions with a held-out season.
4. Add scenario overrides and player analytics.
5. Add an evidence-grounded Spurs AI explanation layer.
