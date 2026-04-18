import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();

    // Log the action before deletion
    if (session?.user) {
      await execute(
        "INSERT INTO staff_logs (staff_id, staff_name, action, target_id, details) VALUES (?,?,?,?,?)",
        [(session.user as any).id, (session.user as any).username || session.user.name || "Staff", "WEB_DELETE", id.toString(), `Permanently deleted request`]
      );
    }

    await execute("DELETE FROM batch_requests WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
