import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "dentbrand-ai",
    timestamp: new Date().toISOString(),
  });
}
