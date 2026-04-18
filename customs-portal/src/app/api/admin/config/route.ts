import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, value } = await req.json();

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    if (value === 'toggle') {
        const current = await execute("SELECT value FROM batch_settings WHERE key = ?", [key]);
        const currentValue = current.rows.length > 0 ? (current.rows[0] as any).value : 'false';
        const newValue = currentValue === 'true' ? 'false' : 'true';
        await execute("INSERT OR REPLACE INTO batch_settings (key, value) VALUES (?, ?)", [key, newValue]);
        return NextResponse.json({ success: true, newValue });
    }

    await execute("INSERT OR REPLACE INTO batch_settings (key, value) VALUES (?, ?)", [key, value]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
    try {
        const settings = await execute("SELECT * FROM batch_settings");
        return NextResponse.json(settings.rows);
    } catch (e) {
        return NextResponse.json([]);
    }
}
