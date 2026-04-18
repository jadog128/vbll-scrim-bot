import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const allBatches = await execute("SELECT * FROM batches ORDER BY id ASC");
    
    let output = `VBLL BATCH EXPORT - ${new Date().toLocaleString()}\n`;
    output += "=".repeat(40) + "\n\n";

    for (const b of allBatches.rows as any[]) {
      const reqs = await execute("SELECT * FROM batch_requests WHERE batch_id = ?", [b.id]);
      output += `[BATCH #${b.id}] — Status: ${b.status?.toUpperCase()}\n`;
      output += `Released At: ${b.released_at || 'Not Released'}\n`;
      output += "-".repeat(20) + "\n";
      
      if (reqs.rows.length) {
        reqs.rows.forEach((r: any) => {
          output += `${r.vrfs_id}|${r.username} | ${r.type} | ${r.proof_url}\n`;
        });
      } else {
        output += "* No requests in this batch.\n";
      }
      output += "\n";
    }

    return new Response(output, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="vbll_batches_export_${Date.now()}.txt"`,
      },
    });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}
