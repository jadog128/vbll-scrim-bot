import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export async function GET() {
  try {
    const info = await execute("PRAGMA table_info(batch_requests)");
    const hasColumn = info.rows.some((c: any) => c.name === 'hidden_from_admin');
    
    if (!hasColumn) {
        await execute("ALTER TABLE batch_requests ADD COLUMN hidden_from_admin INTEGER DEFAULT 0");
        return NextResponse.json({ status: "Column added successfully" });
    }

    return NextResponse.json({ status: "Column already exists", columns: info.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
