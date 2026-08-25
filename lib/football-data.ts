const API_BASE = "https://api.football-data.org/v4";
const REQUEST_TIMEOUT_MS = 10_000;

type ApiMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
};

type ApiStanding = {
  position: number;
  team: { name: string };
  playedGames: number;
  points: number;
  goalDifference: number;
};

async function footballData<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_API_TOKEN is not configured");
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "X-Auth-Token": token, Accept: "application/json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") throw new Error("Football data request timed out");
    throw new Error("Football data service is unavailable");
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("Football data API token was rejected");
    if (response.status === 429) throw new Error("Football data API rate limit reached");
    throw new Error(`Football data request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getLivePremierLeagueData() {
  const [matchesResponse, standingsResponse] = await Promise.all([
    footballData<{ matches: ApiMatch[] }>("/competitions/PL/matches"),
    footballData<{ standings: { type: string; table: ApiStanding[] }[] }>("/competitions/PL/standings")
  ]);
  const table = standingsResponse.standings?.find((standing) => standing.type === "TOTAL")?.table ?? standingsResponse.standings?.[0]?.table ?? [];
  return {
    matches: matchesResponse.matches.map((match) => ({
      id: match.id,
      date: match.utcDate,
      status: match.status,
      home: match.homeTeam.name,
      away: match.awayTeam.name,
      homeGoals: match.score?.fullTime?.home ?? null,
      awayGoals: match.score?.fullTime?.away ?? null
    })),
    standings: table.map((row) => ({
      position: row.position,
      team: row.team.name,
      played: row.playedGames,
      points: row.points,
      goalDifference: row.goalDifference
    })),
    updatedAt: new Date().toISOString()
  };
}
