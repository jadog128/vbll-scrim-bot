import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get('guild') || process.env.BATCH_GUILD_ID || "1286206719847960670";
  const { key, value } = await req.json();

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    if (value === 'toggle') {
        const current = await execute("SELECT value FROM guild_settings WHERE guild_id = ? AND key = ?", [guildId, key]);
        const currentValue = current.rows.length > 0 ? (current.rows[0] as any).value : 'false';
        const newValue = currentValue === 'true' ? 'false' : 'true';
        await execute("INSERT OR REPLACE INTO guild_settings (guild_id, key, value) VALUES (?, ?, ?)", [guildId, key, newValue]);
        return NextResponse.json({ success: true, newValue });
    }

    await execute("INSERT OR REPLACE INTO guild_settings (guild_id, key, value) VALUES (?, ?, ?)", [guildId, key, value]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const guildId = searchParams.get('guild') || process.env.BATCH_GUILD_ID || "1286206719847960670";
        const settings = await execute("SELECT key, value FROM guild_settings WHERE guild_id = ?", [guildId]);
        return NextResponse.json(settings.rows);
    } catch (e) {
        return NextResponse.json([]);
    }
}
