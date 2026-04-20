import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { requestIds, action, reason } = await req.json();

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json({ error: "Invalid request IDs" }, { status: 400 });
    }

    if (action === 'delete') {
      // Soft delete: hide from portal
      const sql = `UPDATE batch_requests SET hidden_from_admin = 1 WHERE id IN (${requestIds.map(() => '?').join(',')})`;
      await execute(sql, requestIds);
      return NextResponse.json({ success: true, count: requestIds.length });
    }

    if (action === 'approve') {
       const sql = `UPDATE batch_requests SET status = 'pending' WHERE id IN (${requestIds.map(() => '?').join(',')}) AND status = 'pre_review'`;
       await execute(sql, requestIds);
       // Logic for DMs in bulk would be heavy here, ideally we trigger them asynchronously
       // For now, we update the DB. User specifically asked for "mass delete/accept/reject"
       return NextResponse.json({ success: true, count: requestIds.length });
    }

    if (action === 'reject') {
        const sql = `UPDATE batch_requests SET status = 'rejected' WHERE id IN (${requestIds.map(() => '?').join(',')})`;
        await execute(sql, requestIds);
        return NextResponse.json({ success: true, count: requestIds.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  } catch (error: any) {
    console.error("[Bulk Action Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
