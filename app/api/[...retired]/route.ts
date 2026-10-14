import { NextResponse } from "next/server";

function retired() {
  return NextResponse.json({ error: "This service is no longer available." }, { status: 410 });
}
export { retired as GET, retired as POST, retired as PUT, retired as PATCH, retired as DELETE };
