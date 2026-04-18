import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await execute(
      "SELECT * FROM batch_tickets WHERE discord_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1",
      [(session.user as any).id]
    );
    return NextResponse.json(res.rows[0] || null);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { issue } = await req.json();

  try {
    await execute(
      "INSERT INTO batch_tickets (discord_id, username, issue, status, source) VALUES (?, ?, ?, ?, ?)",
      [(session.user as any).id, session.user.name, issue, 'open', 'web']
    );
    const newTicket = await execute("SELECT last_insert_rowid() as id");
    return NextResponse.json({ success: true, id: (newTicket.rows[0] as any).id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
