import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const guildId = url.searchParams.get("guild");
  const type = url.searchParams.get("type"); // 'active' or 'ended' or 'all'

  try {
    let query = "SELECT * FROM giveaways";
    const params: any[] = [];

    if (guildId) {
        query += " WHERE guild_id = ?";
        params.push(guildId);
    }

    if (type === 'active') {
        query += guildId ? " AND status = 'active'" : " WHERE status = 'active'";
    } else if (type === 'ended') {
        query += guildId ? " AND status = 'ended'" : " WHERE status = 'ended'";
    }

    query += " ORDER BY end_time DESC";

    const res = await execute(query, params);
    
    // Enrich with entry counts
    const giveaways = await Promise.all(res.rows.map(async (gw: any) => {
        const countRes = await execute("SELECT COUNT(*) as cnt FROM giveaway_entries WHERE giveaway_id = ?", [gw.id]);
        return { ...gw, entryCount: countRes.rows[0].cnt };
    }));

    return NextResponse.json(giveaways);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, id, guildId } = await req.json();

    if (action === 'end') {
        // We'll notify the bot via a webhook or just update DB and let bot check
        // But bot checks every minute. If we want instant, we could hit the bot's API.
        await execute("UPDATE giveaways SET end_time = ? WHERE id = ?", [new Date().toISOString(), id]);
        return NextResponse.json({ success: true, message: "Giveaway scheduled to end in the next cycle." });
    }

    if (action === 'delete') {
        await execute("DELETE FROM giveaways WHERE id = ?", [id]);
        await execute("DELETE FROM giveaway_entries WHERE giveaway_id = ?", [id]);
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
