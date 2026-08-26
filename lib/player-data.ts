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

export type PlayerRecord = ApiPlayer & { team: string; teamId: number; venue?: string };

export async function getPremierLeaguePlayerData() {
  const entries = await Promise.all(Object.entries(PREMIER_LEAGUE_TEAMS).map(async ([team, teamId]) => {
    try {
      const response = await footballData<ApiTeam>(`/teams/${teamId}`);
      return { team, teamId, venue: response.venue, players: (response.squad ?? []).map(player => ({ ...player, team, teamId, venue: response.venue })) };
    } catch (error) {
      return { team, teamId, players: [] as PlayerRecord[], error: error instanceof Error ? error.message : "Unable to load squad" };
    }
  }));
  return { teams: entries, players: entries.flatMap(entry => entry.players), loadedAt: new Date().toISOString() };
}
