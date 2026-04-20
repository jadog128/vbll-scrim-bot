import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export async function GET() {
  try {
    const logs = await execute("SELECT * FROM staff_logs ORDER BY id DESC LIMIT 50");
    return NextResponse.json({ logs: logs.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
