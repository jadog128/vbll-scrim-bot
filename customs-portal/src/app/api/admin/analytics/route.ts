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

  try {
    // 1. Request Trends (Last 7 Days)
    const trends = await execute(`
      SELECT date(created_at) as day, count(*) as count 
      FROM batch_requests 
      WHERE guild_id = ? AND created_at >= date('now', '-7 days')
      GROUP BY day 
      ORDER BY day ASC
    `, [guildId]);

    // 2. Peak Hours (0-23)
    const peakHours = await execute(`
      SELECT strftime('%H', created_at) as hour, count(*) as count 
      FROM batch_requests 
      WHERE guild_id = ? 
      GROUP BY hour 
      ORDER BY hour ASC
    `, [guildId]);

    // 3. Approval Rate
    const approvalStats = await execute(`
      SELECT status, count(*) as count 
      FROM batch_requests 
      WHERE guild_id = ? 
      GROUP BY status
    `, [guildId]);

    return NextResponse.json({
      trends: trends.rows,
      peakHours: peakHours.rows,
      approvalStats: approvalStats.rows
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
