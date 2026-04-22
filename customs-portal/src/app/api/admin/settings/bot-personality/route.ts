import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const guildId = url.searchParams.get("guild");
  if (!guildId) return NextResponse.json({ error: "Guild ID required" }, { status: 400 });

  try {
    const res = await execute(
        "SELECT * FROM batch_settings WHERE key LIKE ? OR key = ?", 
        [`bot_template_${guildId}_%`, `bot_core_config_${guildId}`]
    );
    const data: Record<string, any> = {};
    res.rows.forEach((row: any) => {
      let key = row.key;
      // Strip guild-specific prefix for frontend consumption
      if (key.startsWith(`bot_template_${guildId}_`)) {
          key = key.replace(`bot_template_${guildId}_`, "");
      } else if (key === `bot_core_config_${guildId}`) {
          key = "bot_core_config";
      }

      try {
        data[key] = JSON.parse(row.value);
      } catch {
        data[key] = row.value;
      }
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { type, category, config, guild } = await req.json();
    if (!guild) return NextResponse.json({ error: "Guild required" }, { status: 400 });
    
    let key = "";
    let value = JSON.stringify(config);

    if (type === 'core') {
        key = `bot_core_config_${guild}`;
    } else {
        key = `bot_template_${guild}_${category}`;
    }

    await execute(
      "INSERT INTO batch_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


