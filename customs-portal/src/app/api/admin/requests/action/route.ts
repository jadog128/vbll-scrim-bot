import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId, action } = await req.json();

  if (!requestId || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    if (action === "approve") {
      await execute("UPDATE batch_requests SET status = 'pending' WHERE id = ?", [requestId]);
    } else if (action === "deny") {
      await execute("UPDATE batch_requests SET status = 'rejected' WHERE id = ?", [requestId]);
    } else if (action === "fulfill") {
      // 1. Mark as completed
      await execute("UPDATE batch_requests SET status = 'completed', staff_id = ? WHERE id = ?", [
        (session?.user as any)?.id || "admin",
        requestId
      ]);

      // 2. Assign to an open batch (matching bot logic)
      let batchRes = await execute("SELECT id FROM batches WHERE status = 'open' LIMIT 1");
      let batchId;

      if (batchRes.rows.length === 0) {
        await execute("INSERT INTO batches (status) VALUES ('open')");
        const newBatch = await execute("SELECT last_insert_rowid() as id");
        batchId = (newBatch.rows[0] as any).id;
      } else {
        batchId = (batchRes.rows[0] as any).id;
      }

      await execute("UPDATE batch_requests SET batch_id = ? WHERE id = ?", [batchId, requestId]);

      // 3. Check if batch is full (8 items)
      const countRes = await execute("SELECT COUNT(*) as count FROM batch_requests WHERE batch_id = ?", [batchId]);
      if ((countRes.rows[0] as any).count >= 8) {
        await execute("UPDATE batches SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE id = ?", [batchId]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
