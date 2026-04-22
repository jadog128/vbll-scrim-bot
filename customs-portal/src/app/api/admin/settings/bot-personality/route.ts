import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await execute("SELECT * FROM batch_settings WHERE key LIKE 'bot_template_%' OR key = 'bot_core_config'");
    const data: Record<string, any> = {};
    res.rows.forEach((row: any) => {
      let key = row.key;
      if (key.startsWith("bot_template_")) key = key.replace("bot_template_", "");
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
    const { type, category, config } = await req.json();
    
    let key = "";
    let value = "";

    if (type === 'core') {
        key = "bot_core_config";
        value = JSON.stringify(config);
    } else {
        key = `bot_template_${category}`;
        value = JSON.stringify(config);
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

