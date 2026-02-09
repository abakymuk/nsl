import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  return NextResponse.json({
    status: "ok",
    method: "POST",
    timestamp: new Date().toISOString(),
  });
}
