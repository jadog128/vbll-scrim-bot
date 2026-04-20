import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export async function GET() {
  try {
    const total = await execute("SELECT count(*) as cnt FROM batch_requests");
    const byGuild = await execute("SELECT guild_id, count(*) as cnt FROM batch_requests GROUP BY guild_id");
    const statuses = await execute("SELECT status, count(*) as cnt FROM batch_requests GROUP BY status");
    
    return NextResponse.json({ 
        total: total.rows[0],
        byGuild: byGuild.rows,
        statuses: statuses.rows
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
