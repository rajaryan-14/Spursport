import { NextResponse } from "next/server";
import { getAvailabilityData } from "../../../lib/api-football";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return NextResponse.json(await getAvailabilityData(), { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300" } }); }
  catch (error) { const message = error instanceof Error ? error.message : "Unable to load availability data"; return NextResponse.json({ error: message }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
