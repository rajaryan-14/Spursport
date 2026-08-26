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

const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

async function getOfficialTottenhamSquad(): Promise<ApiPlayer[]> {
  const response = await fetch("https://www.tottenhamhotspur.com/teams/mens/squad", {
    headers: { "User-Agent": "SPURSCOPE/1.0" },
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 86400 }
  });
  if (!response.ok) throw new Error(`Official Spurs squad returned ${response.status}`);

  const html = (await response.text()).split(/Out On Loan/i)[0];
  const players: ApiPlayer[] = [];
  const personPattern = /<a\b[^>]*o-person-pod__inner[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of Array.from(html.matchAll(personPattern))) {
    const anchor = match[0];
    const body = match[1];
    const id = anchor.match(/href=['"]\/player\/(\d+)\//i)?.[1];
    const name = anchor.match(/title=['"]([^'"]+)['"]/i)?.[1]?.trim();
    if (!id || !name) continue;
    const shirtNumber = body.match(/o-person-pod__number[^>]*>\s*(\d+)/i)?.[1];
    const position = body.match(/o-person-pod__position[^>]*>\s*([^<]+)/i)?.[1]?.trim();
    players.push({ id: Number(id), name, position: position || null, shirtNumber: shirtNumber ? Number(shirtNumber) : null, marketValue: null });
  }
  if (players.length < 15) throw new Error("Official Spurs squad could not be parsed");
  return players;
}

export async function getPremierLeaguePlayerData() {
  const scorerResponse = await footballData<{ scorers?: ApiScorer[] }>("/competitions/PL/scorers?limit=100").catch(() => ({ scorers: [] as ApiScorer[] }));
  const scorerMap = new Map(scorerResponse.scorers?.map(scorer => [`${scorer.team.name}:${scorer.player.id}`, { goals: scorer.goals ?? 0, assists: scorer.assists ?? 0 }]) ?? []);
  const scorerNameMap = new Map(scorerResponse.scorers?.map(scorer => [`${scorer.team.name}:${normalizeName(scorer.player.name)}`, { goals: scorer.goals ?? 0, assists: scorer.assists ?? 0 }]) ?? []);
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
      const officialSquad = team === "Tottenham" ? await getOfficialTottenhamSquad().catch(() => null) : null;
      const squad = officialSquad ?? response.squad ?? [];
      const appearancesByName = new Map<string, { starts: number; bench: number }>();
      for (const match of recentResponse.matches ?? []) {
        const side = match.homeTeam.id === teamId ? match.homeTeam : match.awayTeam;
        for (const player of [...(side.lineup ?? []), ...(side.bench ?? [])]) {
          const current = appearancesByName.get(normalizeName(player.name)) ?? { starts: 0, bench: 0 };
          if ((side.lineup ?? []).some(lineupPlayer => lineupPlayer.id === player.id)) current.starts++; else current.bench++;
          appearancesByName.set(normalizeName(player.name), current);
        }
      }
      const players = squad.map(player => { const form = appearances.get(player.id) ?? appearancesByName.get(normalizeName(player.name)) ?? { starts: 0, bench: 0 }; const scoring = scorerMap.get(`${response.name}:${player.id}`) ?? scorerNameMap.get(`${response.name}:${normalizeName(player.name)}`) ?? { goals: 0, assists: 0 }; return { ...player, team, teamId, venue: response.venue, recentStarts: form.starts, recentBench: form.bench, recentMatches: form.starts + form.bench, seasonGoals: scoring.goals, seasonAssists: scoring.assists, availabilityScore: Number(((form.starts + form.bench) / 5).toFixed(2)) }; });
      return { team, teamId, venue: response.venue, source: officialSquad ? "tottenham-official" : "football-data.org", recentMatchesLoaded: recentResponse.matches?.length ?? 0, players };
    } catch (error) {
      return { team, teamId, players: [] as PlayerRecord[], error: error instanceof Error ? error.message : "Unable to load squad" };
    }
  }));
  return { teams: entries, players: entries.flatMap(entry => entry.players), loadedAt: new Date().toISOString() };
}
