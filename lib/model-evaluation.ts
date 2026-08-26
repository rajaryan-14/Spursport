import { normalizeTeamName, prediction, type Match } from "./analytics";
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
  const evaluations: { season: number; samples: number; correct: number; brierTotal: number }[] = [];

  for (const { season, matches } of responses) {
    const prior: Match[] = [];
    let correct = 0;
    let brierTotal = 0;
    for (const actual of matches) {
      if (prior.length >= 30) {
        const probabilities = prediction(actual.home, actual.away, prior);
        const outcome = actual.homeGoals > actual.awayGoals ? "home" : actual.homeGoals < actual.awayGoals ? "away" : "draw";
        const predicted = probabilities.homeWin >= probabilities.draw && probabilities.homeWin >= probabilities.awayWin ? "home" : probabilities.awayWin >= probabilities.draw ? "away" : "draw";
        if (predicted === outcome) correct++;
        brierTotal += (probabilities.homeWin - (outcome === "home" ? 1 : 0)) ** 2 + (probabilities.draw - (outcome === "draw" ? 1 : 0)) ** 2 + (probabilities.awayWin - (outcome === "away" ? 1 : 0)) ** 2;
      }
      prior.push(actual);
    }
    evaluations.push({ season, samples: Math.max(0, matches.length - 30), correct, brierTotal });
  }

  const samples = evaluations.reduce((total, row) => total + row.samples, 0);
  const correct = evaluations.reduce((total, row) => total + row.correct, 0);
  const brierTotal = evaluations.reduce((total, row) => total + row.brierTotal, 0);
  return { seasons: SEASONS, samples, accuracy: Number((correct / Math.max(1, samples)).toFixed(4)), brierScore: Number((brierTotal / Math.max(1, samples)).toFixed(4)), bySeason: evaluations.map(row => ({ season: row.season, samples: row.samples, accuracy: Number((row.correct / Math.max(1, row.samples)).toFixed(4)), brierScore: Number((row.brierTotal / Math.max(1, row.samples)).toFixed(4)) })) };
}
