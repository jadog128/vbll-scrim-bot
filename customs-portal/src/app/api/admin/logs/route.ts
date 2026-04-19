import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get("guild");
  
  if (!guildId) return NextResponse.json({ error: "Guild ID required" }, { status: 400 });

  const logs = await execute("SELECT * FROM staff_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT 50", [guildId]);
  
  return NextResponse.json(logs.rows);
}
