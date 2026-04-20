import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export async function GET() {
  try {
    const settings = await execute("SELECT * FROM batch_settings");
    return NextResponse.json({ settings: settings.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
