import { NextResponse } from "next/server";
import { getPremierLeaguePlayerData } from "../../../lib/player-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getPremierLeaguePlayerData(), { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load player data";
    return NextResponse.json({ error: message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
