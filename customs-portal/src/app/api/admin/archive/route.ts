import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get sent batches
  const batches = await execute("SELECT * FROM batches WHERE status = 'sent' ORDER BY released_at DESC", []);
  
  return NextResponse.json(batches.rows);
}
