import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { allMod } from "@/lib/security_db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const logs = await allMod("SELECT * FROM mod_logs ORDER BY created_at DESC LIMIT 50");
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("[Security Logs]", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
