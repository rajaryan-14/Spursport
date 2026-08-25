import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(process.env.FOOTBALL_DATA_API_TOKEN);
  return NextResponse.json({
    status: configured ? "ok" : "degraded",
    service: "spurscope-api",
    footballDataConfigured: configured,
    timestamp: new Date().toISOString()
  }, {
    status: configured ? 200 : 503,
    headers: { "Cache-Control": "no-store" }
  });
}
