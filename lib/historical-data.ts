import { footballData, type ApiMatch } from "./football-data";

export const HISTORICAL_SEASONS = [2023, 2024, 2025];

type SeasonMatches = { matches: ApiMatch[] };

type TeamAccumulator = {
  team: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  homeMatches: number;
  homePoints: number;
  awayMatches: number;
  awayPoints: number;
  recentResults: ("W" | "D" | "L")[];
};

function ensureTeam(map: Map<string, TeamAccumulator>, team: string) {
  const existing = map.get(team);
  if (existing) return existing;
  const created: TeamAccumulator = { team, matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, homeMatches: 0, homePoints: 0, awayMatches: 0, awayPoints: 0, recentResults: [] };
  map.set(team, created);
  return created;
}

export async function getHistoricalPremierLeagueData() {
  const seasons = await Promise.all(HISTORICAL_SEASONS.map(async season => ({ season, response: await footballData<SeasonMatches>(`/competitions/PL/matches?season=${season}`) })));
  const teams = new Map<string, TeamAccumulator>();
  let matchesLoaded = 0;

  for (const { response } of seasons) {
    for (const match of response.matches ?? []) {
      const score = match.score?.fullTime;
      if (match.status !== "FINISHED" || score?.home == null || score.away == null) continue;
      const home = ensureTeam(teams, match.homeTeam.name);
      const away = ensureTeam(teams, match.awayTeam.name);
      const homeGoals = score.home;
      const awayGoals = score.away;
      const homeResult = homeGoals > awayGoals ? "W" : homeGoals < awayGoals ? "L" : "D";
      const awayResult = homeResult === "W" ? "L" : homeResult === "L" ? "W" : "D";
      home.matches++; away.matches++; home.goalsFor += homeGoals; home.goalsAgainst += awayGoals; away.goalsFor += awayGoals; away.goalsAgainst += homeGoals;
      home.homeMatches++; away.awayMatches++;
      home.homePoints += homeResult === "W" ? 3 : homeResult === "D" ? 1 : 0;
      away.awayPoints += awayResult === "W" ? 3 : awayResult === "D" ? 1 : 0;
      home.wins += homeResult === "W" ? 1 : 0; home.draws += homeResult === "D" ? 1 : 0; home.losses += homeResult === "L" ? 1 : 0;
      away.wins += awayResult === "W" ? 1 : 0; away.draws += awayResult === "D" ? 1 : 0; away.losses += awayResult === "L" ? 1 : 0;
      home.recentResults.push(homeResult); away.recentResults.push(awayResult);
      matchesLoaded++;
    }
  }

  return {
    seasons: HISTORICAL_SEASONS,
    matchesLoaded,
    teams: Array.from(teams.values()).map(team => ({
      ...team,
      points: team.wins * 3 + team.draws,
      pointsPerMatch: Number(((team.wins * 3 + team.draws) / Math.max(1, team.matches)).toFixed(3)),
      goalsForPerMatch: Number((team.goalsFor / Math.max(1, team.matches)).toFixed(3)),
      goalsAgainstPerMatch: Number((team.goalsAgainst / Math.max(1, team.matches)).toFixed(3)),
      homePointsPerMatch: Number((team.homePoints / Math.max(1, team.homeMatches)).toFixed(3)),
      awayPointsPerMatch: Number((team.awayPoints / Math.max(1, team.awayMatches)).toFixed(3)),
      recentResults: team.recentResults.slice(-5)
    }))
  };
}
