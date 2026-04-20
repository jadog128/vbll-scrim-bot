import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export async function GET() {
  try {
    const total = await execute("SELECT count(*) as cnt FROM batch_requests");
    const byGuild = await execute("SELECT guild_id, count(*) as cnt FROM batch_requests GROUP BY guild_id");
    
    return NextResponse.json({ 
        url: (process.env.VBLL_TURSO_URL || process.env.TURSO_URL || "").substring(0, 20) + "...",
        total: total.rows[0],
        byGuild: byGuild.rows
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
