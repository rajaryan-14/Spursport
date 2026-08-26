export type Match = { home: string; away: string; homeGoals: number; awayGoals: number };
export type Fixture = { home: string; away: string };
export type ScenarioOverride = Fixture & { result: "WIN" | "DRAW" | "LOSS" };
export type HistoricalTeamStats = { team: string; matches: number; pointsPerMatch: number; goalsForPerMatch: number; goalsAgainstPerMatch: number; homePointsPerMatch: number; awayPointsPerMatch: number; recentResults: ("W" | "D" | "L")[] };
export type PlayerFormData = { team: string; recentStarts: number; recentBench: number; recentMatches: number; seasonGoals: number; seasonAssists: number; availabilityScore: number; marketValue?: number | null };

export const results: Match[] = [
  {home:"Tottenham",away:"Arsenal",homeGoals:2,awayGoals:1}, {home:"Chelsea",away:"Tottenham",homeGoals:1,awayGoals:1},
  {home:"Tottenham",away:"Liverpool",homeGoals:1,awayGoals:2}, {home:"Manchester City",away:"Tottenham",homeGoals:2,awayGoals:2},
  {home:"Tottenham",away:"Manchester United",homeGoals:3,awayGoals:1}, {home:"Arsenal",away:"Chelsea",homeGoals:2,awayGoals:0},
  {home:"Liverpool",away:"Arsenal",homeGoals:1,awayGoals:1}, {home:"Manchester United",away:"Manchester City",homeGoals:0,awayGoals:2},
  {home:"Chelsea",away:"Manchester City",homeGoals:1,awayGoals:1}, {home:"Arsenal",away:"Manchester United",homeGoals:2,awayGoals:0},
  {home:"Tottenham",away:"Chelsea",homeGoals:2,awayGoals:2}, {home:"Liverpool",away:"Tottenham",homeGoals:2,awayGoals:1}
];
export const teams = ["Arsenal","Chelsea","Liverpool","Manchester City","Manchester United","Tottenham"];

export function normalizeTeamName(name: string) {
  if (name.toLowerCase().includes("tottenham")) return "Tottenham";
  if (name.toLowerCase().includes("arsenal")) return "Arsenal";
  if (name.toLowerCase().includes("chelsea")) return "Chelsea";
  if (name.toLowerCase().includes("liverpool")) return "Liverpool";
  if (name.toLowerCase().includes("manchester city")) return "Manchester City";
  if (name.toLowerCase().includes("manchester united")) return "Manchester United";
  return name;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function eloRatings(dataset: Match[] = results): Record<string, number> {
  const datasetTeams = Array.from(new Set(teams.concat(dataset.flatMap(match => [match.home, match.away]))));
  const ratings: Record<string, number> = Object.fromEntries(datasetTeams.map(t => [t, 1500]));
  for (const match of dataset) {
    const expected = 1 / (1 + 10 ** ((ratings[match.away] - ratings[match.home]) / 400));
    const actual = match.homeGoals > match.awayGoals ? 1 : match.homeGoals < match.awayGoals ? 0 : .5;
    const change = 24 * (actual - expected);
    ratings[match.home] += change; ratings[match.away] -= change;
  }
  return ratings;
}

function blendedRatings(dataset: Match[], historical: HistoricalTeamStats[] = []) {
  const ratings = eloRatings(dataset);
  for (const row of historical) {
    const team = normalizeTeamName(row.team);
    if (ratings[team] === undefined || row.matches < 10) continue;
    const pointsSignal = (row.pointsPerMatch - 1.35) * 110;
    const goalSignal = (row.goalsForPerMatch - row.goalsAgainstPerMatch) * 18;
    const formSignal = row.recentResults.reduce((total, result) => total + (result === "W" ? 1 : result === "D" ? 0 : -1), 0) * 8;
    ratings[team] += pointsSignal + goalSignal + formSignal;
  }
  return ratings;
}

function squadAdjustment(team: string, players: PlayerFormData[]) {
  const squad = players.filter(player => normalizeTeamName(player.team) === team);
  if (!squad.length || !squad.some(player => player.recentMatches > 0)) return 0;
  const core = [...squad].sort((a, b) => (b.recentStarts - a.recentStarts) || ((b.marketValue ?? 0) - (a.marketValue ?? 0))).slice(0, 18);
  const availability = core.reduce((total, player) => total + Math.min(1, player.availabilityScore), 0) / core.length;
  const production = core.reduce((total, player) => total + player.seasonGoals + player.seasonAssists, 0) / core.length;
  return (availability - 0.65) * 42 + Math.min(18, production * 1.5);
}

export function prediction(home: string, away: string, dataset: Match[] = results, historical: HistoricalTeamStats[] = [], players: PlayerFormData[] = []) {
  const ratings = blendedRatings(dataset, historical);
  const homeStats = historical.find(row => normalizeTeamName(row.team) === home);
  const awayStats = historical.find(row => normalizeTeamName(row.team) === away);
  const homeVenueRating = ratings[home] + ((homeStats?.homePointsPerMatch ?? 1.5) - 1.5) * 90 + squadAdjustment(home, players);
  const awayVenueRating = ratings[away] + ((awayStats?.awayPointsPerMatch ?? 1.2) - 1.2) * 90 + squadAdjustment(away, players);
  const homeRate = Math.max(.15, 1.55 + (homeVenueRating - 1500) / 1000 - (awayVenueRating - 1500) / 2600);
  const awayRate = Math.max(.15, 1.15 + (awayVenueRating - 1500) / 1000 - (homeVenueRating - 1500) / 3200);
  const homeWin = Math.min(.9, Math.max(.05, .5 + (homeRate - awayRate) * .16));
  const draw = .24;
  return { homeRate, awayRate, homeWin, draw, awayWin:1 - homeWin - draw };
}

export function simulation(dataset: Match[] = results, remainingFixtures: Fixture[] = [{home:"Tottenham",away:"Arsenal"},{home:"Liverpool",away:"Tottenham"},{home:"Tottenham",away:"Chelsea"},{home:"Manchester City",away:"Tottenham"}], overrides: ScenarioOverride[] = [], historical: HistoricalTeamStats[] = [], players: PlayerFormData[] = []) {
  const simulationTeams = Array.from(new Set(teams.concat(dataset.flatMap(match => [match.home, match.away]), remainingFixtures.flatMap(fixture => [fixture.home, fixture.away]))));
  const base: Record<string, number> = Object.fromEntries(simulationTeams.map(t => [t, 0]));
  for (const m of dataset) { if (m.homeGoals > m.awayGoals) base[m.home] += 3; else if (m.homeGoals < m.awayGoals) base[m.away] += 3; else { base[m.home]++; base[m.away]++; } }
  const counts: Record<string, number[]> = Object.fromEntries(simulationTeams.map(t => [t, []]));
  const random = seededRandom(42);
  const fixtureModels = remainingFixtures.map(fixture => ({ fixture, probability: prediction(fixture.home, fixture.away, dataset, historical, players), override: overrides.find(item => item.home === fixture.home && item.away === fixture.away) }));
  for (let i=0; i<5000; i++) { const points = {...base}; for (const { fixture: f, probability: p, override } of fixtureModels) { if (override?.result === "WIN") points[f.home] += 3; else if (override?.result === "LOSS") points[f.away] += 3; else if (override?.result === "DRAW") { points[f.home]++; points[f.away]++; } else { const r = random(); if (r < p.homeWin) points[f.home] += 3; else if (r > p.homeWin + p.draw) points[f.away] += 3; else { points[f.home]++; points[f.away]++; } } } const ordered = [...simulationTeams].sort((a,b) => points[b] - points[a]); ordered.forEach((t,idx) => counts[t].push(idx+1)); }
  return simulationTeams.map(team => { const positions = counts[team]; return {team, avg:positions.reduce((a,b)=>a+b,0)/positions.length, top4:positions.filter(p=>p<=4).length/positions.length, top6:positions.filter(p=>p<=6).length/positions.length}; }).sort((a,b)=>a.avg-b.avg);
}
