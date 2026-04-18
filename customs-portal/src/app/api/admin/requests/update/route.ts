import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, vrfs_id, status, batch_id } = await req.json();

  await execute(
    "UPDATE batch_requests SET vrfs_id = ?, status = ?, batch_id = ? WHERE id = ?", 
    [vrfs_id, status, batch_id === "" ? null : batch_id, id]
  );
  
  // Log the action
  if (session?.user) {
    await execute(
      "INSERT INTO staff_logs (staff_id, staff_name, action, target_id, details) VALUES (?,?,?,?,?)",
      [(session.user as any).id, (session.user as any).username || session.user.name, "WEB_EDIT", id, `Modified VRFS/Status/Batch`]
    );
  }

  return NextResponse.json({ success: true });
}
