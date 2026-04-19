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

  // Get sent batches for this guild
  const batches = await execute("SELECT * FROM batches WHERE status = 'sent' AND guild_id = ? ORDER BY released_at DESC", [guildId]);
  
  return NextResponse.json(batches.rows);
}
