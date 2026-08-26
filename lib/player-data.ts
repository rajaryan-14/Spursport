import { footballData } from "./football-data";

const PREMIER_LEAGUE_TEAMS = {
  Tottenham: 73,
  Arsenal: 57,
  Chelsea: 61,
  Liverpool: 64,
  "Manchester City": 65,
  "Manchester United": 66
} as const;

type ApiPlayer = {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  position?: string | null;
  nationality?: string | null;
  shirtNumber?: number | null;
  dateOfBirth?: string | null;
  marketValue?: number | null;
};

type ApiTeam = { id: number; name: string; shortName?: string; crest?: string; venue?: string; squad?: ApiPlayer[] };
type ApiLineupPlayer = { id: number; name: string };
type ApiTeamMatch = { status: string; homeTeam: { id: number; lineup?: ApiLineupPlayer[]; bench?: ApiLineupPlayer[] }; awayTeam: { id: number; lineup?: ApiLineupPlayer[]; bench?: ApiLineupPlayer[] } };
type ApiScorer = { player: { id: number; name: string }; team: { name: string }; goals?: number; assists?: number };

export type PlayerRecord = ApiPlayer & { team: string; teamId: number; venue?: string; recentStarts: number; recentBench: number; recentMatches: number; seasonGoals: number; seasonAssists: number; availabilityScore: number };

export async function getPremierLeaguePlayerData() {
  const scorerResponse = await footballData<{ scorers?: ApiScorer[] }>("/competitions/PL/scorers?limit=100").catch(() => ({ scorers: [] as ApiScorer[] }));
  const scorerMap = new Map(scorerResponse.scorers?.map(scorer => [`${scorer.team.name}:${scorer.player.id}`, { goals: scorer.goals ?? 0, assists: scorer.assists ?? 0 }]) ?? []);
  const entries = await Promise.all(Object.entries(PREMIER_LEAGUE_TEAMS).map(async ([team, teamId]) => {
    try {
      const [response, recentResponse] = await Promise.all([
        footballData<ApiTeam>(`/teams/${teamId}`),
        footballData<{ matches?: ApiTeamMatch[] }>(`/teams/${teamId}/matches?status=FINISHED&limit=5`, { "X-Unfold-Lineups": "true" }).catch(() => ({ matches: [] as ApiTeamMatch[] }))
      ]);
      const appearances = new Map<number, { starts: number; bench: number }>();
      for (const match of recentResponse.matches ?? []) {
        const side = match.homeTeam.id === teamId ? match.homeTeam : match.awayTeam;
        for (const player of side.lineup ?? []) { const current = appearances.get(player.id) ?? { starts: 0, bench: 0 }; current.starts++; appearances.set(player.id, current); }
        for (const player of side.bench ?? []) { const current = appearances.get(player.id) ?? { starts: 0, bench: 0 }; current.bench++; appearances.set(player.id, current); }
      }
      const players = (response.squad ?? []).map(player => { const form = appearances.get(player.id) ?? { starts: 0, bench: 0 }; const scoring = scorerMap.get(`${response.name}:${player.id}`) ?? { goals: 0, assists: 0 }; return { ...player, team, teamId, venue: response.venue, recentStarts: form.starts, recentBench: form.bench, recentMatches: form.starts + form.bench, seasonGoals: scoring.goals, seasonAssists: scoring.assists, availabilityScore: Number(((form.starts + form.bench) / 5).toFixed(2)) }; });
      return { team, teamId, venue: response.venue, recentMatchesLoaded: recentResponse.matches?.length ?? 0, players };
    } catch (error) {
      return { team, teamId, players: [] as PlayerRecord[], error: error instanceof Error ? error.message : "Unable to load squad" };
    }
  }));
  return { teams: entries, players: entries.flatMap(entry => entry.players), loadedAt: new Date().toISOString() };
}
