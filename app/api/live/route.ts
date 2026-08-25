import { NextResponse } from "next/server";
import { getLivePremierLeagueData } from "../../../lib/football-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getLivePremierLeagueData(), {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load live data";
    return NextResponse.json({ error: message }, {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
