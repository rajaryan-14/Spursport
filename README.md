# SPURSCOPE

Predict • Simulate • Explain

An extensible Tottenham Hotspur / Premier League analytics MVP. The first version includes:

- Elo ratings calculated from match results
- Poisson-based score and win/draw/loss probabilities
- Monte Carlo league-position simulation
- A responsive Next.js dashboard designed for Vercel

## Run locally

```powershell
npm install
npm run dev
```

The web dashboard is the Next.js app in `app/` and is designed for Vercel. Server-side data clients and model logic live in `lib/`.

## Live data

Copy `.env.example` to `.env.local` and set `FOOTBALL_DATA_API_TOKEN`. The Next.js server route at `/api/live` reads the token securely, fetches Premier League matches and standings, and never exposes the token to the browser. Add the same variable in Vercel under Project Settings → Environment Variables before deploying.

## Next milestones

1. Load complete historical PL results and current fixtures.
2. Add xG and opponent-strength features.
3. Calibrate predictions with a held-out season.
4. Add scenario overrides and player analytics.
5. Add an evidence-grounded Spurs AI explanation layer.
