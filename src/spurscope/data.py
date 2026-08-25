from pathlib import Path

import pandas as pd


REQUIRED_COLUMNS = {"date", "home_team", "away_team", "home_goals", "away_goals"}


def load_results(path: str | Path) -> pd.DataFrame:
    """Load and validate match results from CSV."""
    frame = pd.read_csv(path, parse_dates=["date"])
    missing = REQUIRED_COLUMNS - set(frame.columns)
    if missing:
        raise ValueError(f"Results file is missing columns: {sorted(missing)}")
    if frame[list(REQUIRED_COLUMNS)].isna().any().any():
        raise ValueError("Results file contains missing values in required columns")
    return frame.sort_values("date").reset_index(drop=True)
