import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await execute(
      `SELECT * FROM broadcasts WHERE active = 1 ORDER BY created_at DESC LIMIT 5`
    );
    return NextResponse.json({ broadcasts: result.rows });
  } catch (error: any) {
    console.error("Fetch Broadcasts Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
