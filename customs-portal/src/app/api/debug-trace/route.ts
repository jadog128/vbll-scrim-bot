import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await execute("INSERT INTO staff_logs (action, details) VALUES (?,?)", ["DEBUG_TRACE", JSON.stringify(body)]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
