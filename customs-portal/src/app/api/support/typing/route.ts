import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketId } = await req.json();
  const isAdmin = (session.user as any).isAdmin;

  try {
    const col = isAdmin ? "staff_typing_at" : "user_typing_at";
    await execute(
      `UPDATE batch_tickets SET ${col} = CURRENT_TIMESTAMP WHERE id = ?`,
      [ticketId]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
