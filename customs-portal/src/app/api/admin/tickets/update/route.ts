import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, status } = await req.json();

    await execute("UPDATE batch_tickets SET status = ? WHERE id = ?", [status, id]);

    // Log the action
    if (session?.user) {
      await execute(
        "INSERT INTO staff_logs (staff_id, staff_name, action, target_id, details) VALUES (?,?,?,?,?)",
        [(session.user as any).id, (session.user as any).username || session.user.name || "Staff", "TICKET_STATUS", id.toString(), `Changed status to ${status.toUpperCase()}`]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Ticket Update Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
