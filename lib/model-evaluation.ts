import { normalizeTeamName, prediction, type HistoricalTeamStats, type Match } from "./analytics";
import { footballData, type ApiMatch } from "./football-data";

const SEASONS = [2023, 2024, 2025];

function finishedMatches(matches: ApiMatch[]): Match[] {
  return (matches ?? []).filter(match => match.status === "FINISHED" && match.score?.fullTime?.home != null && match.score.fullTime.away != null).map(match => ({
    home: normalizeTeamName(match.homeTeam.name),
    away: normalizeTeamName(match.awayTeam.name),
    homeGoals: match.score!.fullTime!.home!,
    awayGoals: match.score!.fullTime!.away!
  }));
}

export async function evaluateModel() {
  const responses = await Promise.all(SEASONS.map(async season => ({ season, matches: finishedMatches((await footballData<{ matches: ApiMatch[] }>(`/competitions/PL/matches?season=${season}`)).matches) })));
  const evaluations: { season: number; samples: number; baselineCorrect: number; enhancedCorrect: number; baselineBrier: number; enhancedBrier: number }[] = [];

  for (const { season, matches } of responses) {
    const prior: Match[] = [];
    let baselineCorrect = 0;
    let enhancedCorrect = 0;
    let baselineBrier = 0;
    let enhancedBrier = 0;
    for (const actual of matches) {
      if (prior.length >= 30) {
        const baseline = prediction(actual.home, actual.away, prior);
        const enhanced = prediction(actual.home, actual.away, prior, statsFromMatches(prior));
        const outcome = actual.homeGoals > actual.awayGoals ? "home" : actual.homeGoals < actual.awayGoals ? "away" : "draw";
        const baselinePredicted = baseline.homeWin >= baseline.draw && baseline.homeWin >= baseline.awayWin ? "home" : baseline.awayWin >= baseline.draw ? "away" : "draw";
        const enhancedPredicted = enhanced.homeWin >= enhanced.draw && enhanced.homeWin >= enhanced.awayWin ? "home" : enhanced.awayWin >= enhanced.draw ? "away" : "draw";
        if (baselinePredicted === outcome) baselineCorrect++;
        if (enhancedPredicted === outcome) enhancedCorrect++;
        baselineBrier += brier(baseline, outcome);
        enhancedBrier += brier(enhanced, outcome);
      }
      prior.push(actual);
    }
    evaluations.push({ season, samples: Math.max(0, matches.length - 30), baselineCorrect, enhancedCorrect, baselineBrier, enhancedBrier });
  }

  const samples = evaluations.reduce((total, row) => total + row.samples, 0);
  const baselineCorrect = evaluations.reduce((total, row) => total + row.baselineCorrect, 0);
  const enhancedCorrect = evaluations.reduce((total, row) => total + row.enhancedCorrect, 0);
  const baselineBrier = evaluations.reduce((total, row) => total + row.baselineBrier, 0);
  const enhancedBrier = evaluations.reduce((total, row) => total + row.enhancedBrier, 0);
  return { seasons: SEASONS, samples, baseline: metrics(baselineCorrect, baselineBrier, samples), enhanced: metrics(enhancedCorrect, enhancedBrier, samples), improvement: Number(((enhancedCorrect - baselineCorrect) / Math.max(1, samples)).toFixed(4)), bySeason: evaluations.map(row => ({ season: row.season, samples: row.samples, baseline: metrics(row.baselineCorrect, row.baselineBrier, row.samples), enhanced: metrics(row.enhancedCorrect, row.enhancedBrier, row.samples) })) };
}

function metrics(correct: number, brierTotal: number, samples: number) { return { accuracy: Number((correct / Math.max(1, samples)).toFixed(4)), brierScore: Number((brierTotal / Math.max(1, samples)).toFixed(4)) }; }
function brier(probabilities: ReturnType<typeof prediction>, outcome: "home" | "draw" | "away") { return (probabilities.homeWin - (outcome === "home" ? 1 : 0)) ** 2 + (probabilities.draw - (outcome === "draw" ? 1 : 0)) ** 2 + (probabilities.awayWin - (outcome === "away" ? 1 : 0)) ** 2; }
function statsFromMatches(matches: Match[]): HistoricalTeamStats[] {
  const map = new Map<string, { team: string; matches: number; points: number; goalsFor: number; goalsAgainst: number; homeMatches: number; homePoints: number; awayMatches: number; awayPoints: number; recentResults: ("W" | "D" | "L")[] }>();
  const get = (team: string) => { const existing = map.get(team); if (existing) return existing; const created = { team, matches: 0, points: 0, goalsFor: 0, goalsAgainst: 0, homeMatches: 0, homePoints: 0, awayMatches: 0, awayPoints: 0, recentResults: [] as ("W" | "D" | "L")[] }; map.set(team, created); return created; };
  for (const match of matches) { const home = get(match.home); const away = get(match.away); const result = match.homeGoals > match.awayGoals ? "W" : match.homeGoals < match.awayGoals ? "L" : "D"; const awayResult = result === "W" ? "L" : result === "L" ? "W" : "D"; const homePoints = result === "W" ? 3 : result === "D" ? 1 : 0; const awayPoints = awayResult === "W" ? 3 : awayResult === "D" ? 1 : 0; home.matches++; away.matches++; home.points += homePoints; away.points += awayPoints; home.goalsFor += match.homeGoals; home.goalsAgainst += match.awayGoals; away.goalsFor += match.awayGoals; away.goalsAgainst += match.homeGoals; home.homeMatches++; away.awayMatches++; home.homePoints += homePoints; away.awayPoints += awayPoints; home.recentResults.push(result); away.recentResults.push(awayResult); }
  return Array.from(map.values()).map(row => ({ team: row.team, matches: row.matches, pointsPerMatch: row.points / Math.max(1, row.matches), goalsForPerMatch: row.goalsFor / Math.max(1, row.matches), goalsAgainstPerMatch: row.goalsAgainst / Math.max(1, row.matches), homePointsPerMatch: row.homePoints / Math.max(1, row.homeMatches), awayPointsPerMatch: row.awayPoints / Math.max(1, row.awayMatches), recentResults: row.recentResults.slice(-5) }));
}
