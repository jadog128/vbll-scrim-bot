import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await execute("SELECT * FROM batch_settings WHERE key LIKE 'bot_template_%'");
    const templates: Record<string, any> = {};
    res.rows.forEach((row: any) => {
      const key = row.key.replace("bot_template_", "");
      try {
        templates[key] = JSON.parse(row.value);
      } catch {
        templates[key] = row.value;
      }
    });
    return NextResponse.json(templates);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { category, config } = await req.json();
    const key = `bot_template_${category}`;
    const value = JSON.stringify(config);

    // Upsert logic for Turso/SQLite
    await execute(
      "INSERT INTO batch_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
