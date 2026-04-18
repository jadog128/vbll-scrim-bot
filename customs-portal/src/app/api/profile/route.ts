import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  
  const latestReq = await execute("SELECT vrfs_id FROM batch_requests WHERE discord_id = ? ORDER BY id DESC LIMIT 1", [userId]);
  const customCount = await execute("SELECT COUNT(*) as cnt FROM batch_requests WHERE discord_id = ? AND status = 'completed'", [userId]);
  const recentApproved = await execute("SELECT type, created_at FROM batch_requests WHERE discord_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 3", [userId]);

  return NextResponse.json({
    vrfsId: (latestReq.rows[0] as any)?.vrfs_id || "NOT SET",
    totalCustoms: (customCount.rows[0] as any).cnt,
    recentApproved: recentApproved.rows
  });
}
