import { execute } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const discordId = (session.user as any).id;
    const username = session.user.name;
    const avatar = session.user.image;

    try {
        // Init table if not exists (libsql handles this well)
        await execute(`
            CREATE TABLE IF NOT EXISTS staff_activity (
                discord_id TEXT PRIMARY KEY,
                username TEXT,
                avatar_url TEXT,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'idle'
            )
        `);

        await execute(`
            INSERT INTO staff_activity (discord_id, username, avatar_url, last_active, status)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'active')
            ON CONFLICT(discord_id) DO UPDATE SET
                last_active = CURRENT_TIMESTAMP,
                avatar_url = excluded.avatar_url,
                status = 'active'
        `, [discordId, username, avatar]);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        // Fetch staff active in the last 10 minutes
        const res = await execute(`
            SELECT * FROM staff_activity 
            WHERE last_active > datetime('now', '-10 minutes')
            ORDER BY last_active DESC
        `);
        return NextResponse.json(res.rows);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
