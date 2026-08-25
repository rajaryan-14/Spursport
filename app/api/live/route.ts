import { NextResponse } from "next/server";
import { getLivePremierLeagueData } from "../../../lib/football-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getLivePremierLeagueData());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load live data";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
