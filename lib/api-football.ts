const API_BASE = "https://v3.football.api-sports.io";
const LEAGUE_ID = 39;
const TEAM_IDS = { Tottenham: 47, Arsenal: 42, Chelsea: 49, Liverpool: 40, "Manchester City": 50, "Manchester United": 33 } as const;

type ApiResponse<T> = { response?: T[]; errors?: Record<string, string> };
type Fixture = { fixture: { id: number; date: string; status?: { short?: string } }; teams: { home: { id: number; name: string }; away: { id: number; name: string } } };
type Injury = { player?: { id?: number; name?: string; reason?: string; type?: string }; fixture?: { date?: string }; team?: { name?: string } };
type Lineup = { team: { id: number; name: string }; formation?: string; startXI?: { player: { id: number; name: string; pos?: string } }[]; substitutes?: { player: { id: number; name: string; pos?: string } }[] };

const currentSeason = () => { const now = new Date(); return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1; };

async function apiFootball<T>(path: string): Promise<T[]> {
  const token = process.env.API_FOOTBALL_TOKEN;
  if (!token) throw new Error("API_FOOTBALL_TOKEN is not configured");
  const response = await fetch(`${API_BASE}${path}`, { headers: { "x-apisports-key": token, Accept: "application/json" }, next: { revalidate: 900 }, signal: AbortSignal.timeout(10_000) });
  if (response.status === 401 || response.status === 403) throw new Error("API-Football token was rejected");
  if (response.status === 429) throw new Error("API-Football rate limit reached");
  if (!response.ok) throw new Error(`API-Football request failed: ${response.status}`);
  const data = await response.json() as ApiResponse<T>;
  if (data.errors && Object.keys(data.errors).length) throw new Error("API-Football returned an error");
  return data.response ?? [];
}

export async function getAvailabilityData() {
  const tokenConfigured = Boolean(process.env.API_FOOTBALL_TOKEN);
  if (!tokenConfigured) return { configured: false, season: currentSeason(), teams: [], message: "Add API_FOOTBALL_TOKEN to enable injuries and expected lineups." };
  const season = currentSeason();
  const teams = await Promise.all(Object.entries(TEAM_IDS).map(async ([team, teamId]) => {
    try {
      const [injuries, fixtures] = await Promise.all([apiFootball<Injury>(`/injuries?league=${LEAGUE_ID}&season=${season}&team=${teamId}`), apiFootball<Fixture>(`/fixtures?league=${LEAGUE_ID}&season=${season}&team=${teamId}&next=1`)]);
      const nextFixture = fixtures[0];
      const lineups = nextFixture ? await apiFootball<Lineup>(`/fixtures/lineups?fixture=${nextFixture.fixture.id}`).catch(() => []) : [];
      const lineup = lineups.find(item => item.team.id === teamId);
      return { team, teamId, nextFixture: nextFixture ? { id: nextFixture.fixture.id, date: nextFixture.fixture.date, home: nextFixture.teams.home.name, away: nextFixture.teams.away.name } : null, injuries: injuries.map(item => ({ player: item.player?.name ?? "Unknown", reason: item.player?.reason ?? item.player?.type ?? "Unavailable", date: item.fixture?.date ?? null })), expectedLineup: lineup ? { formation: lineup.formation ?? null, starters: (lineup.startXI ?? []).map(row => row.player), substitutes: (lineup.substitutes ?? []).map(row => row.player) } : null };
    } catch (error) { return { team, teamId, nextFixture: null, injuries: [], expectedLineup: null, error: error instanceof Error ? error.message : "Unable to load availability" }; }
  }));
  return { configured: true, season, teams, loadedAt: new Date().toISOString() };
}
