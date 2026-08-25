export type Match = { home: string; away: string; homeGoals: number; awayGoals: number };
export type Fixture = { home: string; away: string };

export const results: Match[] = [
  {home:"Tottenham",away:"Arsenal",homeGoals:2,awayGoals:1}, {home:"Chelsea",away:"Tottenham",homeGoals:1,awayGoals:1},
  {home:"Tottenham",away:"Liverpool",homeGoals:1,awayGoals:2}, {home:"Manchester City",away:"Tottenham",homeGoals:2,awayGoals:2},
  {home:"Tottenham",away:"Manchester United",homeGoals:3,awayGoals:1}, {home:"Arsenal",away:"Chelsea",homeGoals:2,awayGoals:0},
  {home:"Liverpool",away:"Arsenal",homeGoals:1,awayGoals:1}, {home:"Manchester United",away:"Manchester City",homeGoals:0,awayGoals:2},
  {home:"Chelsea",away:"Manchester City",homeGoals:1,awayGoals:1}, {home:"Arsenal",away:"Manchester United",homeGoals:2,awayGoals:0},
  {home:"Tottenham",away:"Chelsea",homeGoals:2,awayGoals:2}, {home:"Liverpool",away:"Tottenham",homeGoals:2,awayGoals:1}
];
export const teams = ["Arsenal","Chelsea","Liverpool","Manchester City","Manchester United","Tottenham"];

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function eloRatings(): Record<string, number> {
  const ratings: Record<string, number> = Object.fromEntries(teams.map(t => [t, 1500]));
  for (const match of results) {
    const expected = 1 / (1 + 10 ** ((ratings[match.away] - ratings[match.home]) / 400));
    const actual = match.homeGoals > match.awayGoals ? 1 : match.homeGoals < match.awayGoals ? 0 : .5;
    const change = 24 * (actual - expected);
    ratings[match.home] += change; ratings[match.away] -= change;
  }
  return ratings;
}

export function prediction(home: string, away: string) {
  const ratings = eloRatings();
  const homeRate = Math.max(.15, 1.55 + (ratings[home] - 1500) / 1000 - (ratings[away] - 1500) / 2600);
  const awayRate = Math.max(.15, 1.15 + (ratings[away] - 1500) / 1000 - (ratings[home] - 1500) / 3200);
  const homeWin = Math.min(.9, Math.max(.05, .5 + (homeRate - awayRate) * .16));
  const draw = .24;
  return { homeRate, awayRate, homeWin, draw, awayWin:1 - homeWin - draw };
}

export function simulation() {
  const base: Record<string, number> = Object.fromEntries(teams.map(t => [t, 0]));
  for (const m of results) { if (m.homeGoals > m.awayGoals) base[m.home] += 3; else if (m.homeGoals < m.awayGoals) base[m.away] += 3; else { base[m.home]++; base[m.away]++; } }
  const fixtures: Fixture[] = [{home:"Tottenham",away:"Arsenal"},{home:"Liverpool",away:"Tottenham"},{home:"Tottenham",away:"Chelsea"},{home:"Manchester City",away:"Tottenham"}];
  const counts: Record<string, number[]> = Object.fromEntries(teams.map(t => [t, []]));
  const random = seededRandom(42);
  for (let i=0; i<5000; i++) { const points = {...base}; for (const f of fixtures) { const p = prediction(f.home, f.away); const r = random(); if (r < p.homeWin) points[f.home] += 3; else if (r > p.homeWin + p.draw) points[f.away] += 3; else { points[f.home]++; points[f.away]++; } } const ordered = [...teams].sort((a,b) => points[b] - points[a]); ordered.forEach((t,idx) => counts[t].push(idx+1)); }
  return teams.map(team => { const positions = counts[team]; return {team, avg:positions.reduce((a,b)=>a+b,0)/positions.length, top4:positions.filter(p=>p<=4).length/positions.length, top6:positions.filter(p=>p<=6).length/positions.length}; }).sort((a,b)=>a.avg-b.avg);
}
