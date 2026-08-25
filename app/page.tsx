"use client";

import { useEffect, useMemo, useState } from "react";
import { eloRatings, normalizeTeamName, prediction, simulation, teams, type Fixture, type Match } from "../lib/analytics";

const pct = (value:number) => `${(value * 100).toFixed(1)}%`;

export default function Home() {
  const [home, setHome] = useState("Tottenham");
  const [away, setAway] = useState("Arsenal");
  const [live, setLive] = useState<{standings: {position:number;team:string;played:number;points:number;goalDifference:number}[]; matches: {id:number;date:string;status:string;home:string;away:string;homeGoals:number|null;awayGoals:number|null}[]; updatedAt:string} | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const liveResults = useMemo<Match[] | undefined>(() => {
    const completed = live?.matches.filter(match => match.status === "FINISHED" && match.homeGoals !== null && match.awayGoals !== null) ?? [];
    if (!completed.length) return undefined;
    return completed.map(match => ({ home: normalizeTeamName(match.home), away: normalizeTeamName(match.away), homeGoals: match.homeGoals as number, awayGoals: match.awayGoals as number }));
  }, [live]);
  const liveFixtures = useMemo<Fixture[] | undefined>(() => {
    const scheduled = live?.matches.filter(match => match.status === "SCHEDULED" || match.status === "TIMED") ?? [];
    if (!scheduled.length) return undefined;
    return scheduled.map(match => ({ home: normalizeTeamName(match.home), away: normalizeTeamName(match.away) }));
  }, [live]);
  const match = useMemo(() => prediction(home, away, liveResults), [home, away, liveResults]);
  const table = useMemo(() => simulation(liveResults, liveFixtures), [liveResults, liveFixtures]);
  const ratings = eloRatings(liveResults);
  useEffect(() => { fetch("/api/live").then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setLive(data); }).catch(error => setLiveError(error.message)); }, []);
  const spursMatches = live?.matches.filter(match => match.home.includes("Tottenham") || match.away.includes("Tottenham")).slice(0, 5) ?? [];
  return <main className="shell">
    <header className="topbar"><div className="brand">SPURSCOPE</div><div className="badge">{live ? "LIVE DATA CONNECTED" : "MVP • DEMO FALLBACK"}</div></header>
    <section className="hero"><div><div className="kicker">Tottenham Hotspur analytics</div><h1>Can Spurs beat the odds?</h1><p className="lede">Predict matches, simulate the season, and understand the numbers behind every result.</p></div></section>
    <div className="grid">
      <section className="panel"><h2>Match predictor</h2><div className="controls"><div><label>Home team</label><select value={home} onChange={e=>setHome(e.target.value)}>{teams.map(t=><option key={t}>{t}</option>)}</select></div><div className="versus">VS</div><div><label>Away team</label><select value={away} onChange={e=>setAway(e.target.value)}>{teams.filter(t=>t!==home).map(t=><option key={t}>{t}</option>)}</select></div></div><div className="score"><strong>{match.homeRate.toFixed(2)} – {match.awayRate.toFixed(2)}</strong><span>expected goals</span></div><div className="probabilities"><div className="prob"><small>Home win</small><b>{pct(match.homeWin)}</b></div><div className="prob"><small>Draw</small><b>{pct(match.draw)}</b></div><div className="prob"><small>Away win</small><b>{pct(match.awayWin)}</b></div></div></section>
      <section className="panel"><h2>Elo power ratings</h2><table className="table"><thead><tr><th>Team</th><th>Elo</th><th>Strength</th></tr></thead><tbody>{Object.entries(ratings).sort(([,a],[,b])=>b-a).map(([team, elo])=><tr key={team}><td className={team==="Tottenham"?"highlight":""}>{team}</td><td>{Math.round(elo)}</td><td><div className="bar"><i style={{width:`${Math.max(8,Math.min(100,(elo-1400)/2))}%`}} /></div></td></tr>)}</tbody></table></section>
      <section className="panel full"><h2>Where will Spurs finish? <span style={{color:"var(--muted)",fontWeight:400}}>5,000 season simulations</span></h2><table className="table"><thead><tr><th>Team</th><th>Expected finish</th><th>Top 4</th><th>Top 6</th></tr></thead><tbody>{table.map(row=><tr key={row.team}><td className={row.team==="Tottenham"?"highlight":""}>{row.team}</td><td>{row.avg.toFixed(1)}</td><td>{pct(row.top4)}</td><td>{pct(row.top6)}</td></tr>)}</tbody></table><p className="notice">{liveFixtures ? "The simulator is using completed live results and the full scheduled fixture list." : "The simulator is using demo results and fixtures until live data is connected."}</p></section>
      <section className="panel full"><h2>Live Premier League feed</h2>{liveError ? <p className="notice">Live feed unavailable: {liveError}. The dashboard is using demo data until the token is configured correctly.</p> : live ? <><p className="notice">Updated {new Date(live.updatedAt).toLocaleTimeString()} • {live.standings.length} teams loaded from football-data.org</p><table className="table"><thead><tr><th>Pos</th><th>Team</th><th>Played</th><th>Points</th><th>GD</th></tr></thead><tbody>{live.standings.slice(0, 10).map(row=><tr key={row.team}><td>{row.position}</td><td className={row.team.includes("Tottenham")?"highlight":""}>{row.team}</td><td>{row.played}</td><td>{row.points}</td><td>{row.goalDifference}</td></tr>)}</tbody></table><h2 style={{marginTop:24}}>Spurs fixtures and results</h2><table className="table"><tbody>{spursMatches.map(match=><tr key={match.id}><td>{new Date(match.date).toLocaleDateString()}</td><td>{match.home} v {match.away}</td><td>{match.homeGoals === null ? match.status : `${match.homeGoals} – ${match.awayGoals}`}</td></tr>)}</tbody></table></> : <p className="notice">Connecting to live Premier League data…</p>}</section>
    </div>
  </main>;
}
