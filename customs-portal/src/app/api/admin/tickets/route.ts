import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await execute("SELECT * FROM batch_tickets WHERE status = 'open' ORDER BY created_at DESC", []);
  
  return NextResponse.json(tickets.rows);
}
