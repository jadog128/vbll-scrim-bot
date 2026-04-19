import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import { Package, Users, ArrowBigRight, Settings2 } from "lucide-react";
import Link from "next/link";
import AdminBatchManager from "@/components/AdminBatchManager";

export const dynamic = "force-dynamic";

export default async function AdminBatches() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) redirect("/");

  // Fetch all open or released batches
  const batchesRes = await execute(
    "SELECT * FROM batches WHERE status != 'sent' ORDER BY id DESC", 
    []
  );
  
  const batches = [];
  for (const b of batchesRes.rows as any[]) {
    const reqs = await execute("SELECT * FROM batch_requests WHERE batch_id = ?", [b.id]);
    batches.push({ ...b, requests: reqs.rows });
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-1 flex items-center gap-3">
             <Link href="/admin">
                <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">arrow_back</span>
             </Link>
             Batch Logistics
          </h2>
          <p className="text-on-surface-variant text-sm font-medium">Refine, reorder, and finalize batch assignments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {batches.map((batch) => (
          <AdminBatchManager key={batch.id} batch={batch} />
        ))}
        
        {batches.length === 0 && (
          <div className="col-span-full py-40 text-center bg-surface-container-low/30 rounded-[3rem] border-2 border-dashed border-outline-variant/10">
             <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
                <Package className="w-10 h-10" />
             </div>
             <h3 className="text-xl font-bold text-on-surface mb-2">No Active Batches</h3>
             <p className="text-on-surface-variant max-w-sm mx-auto font-medium">As soon as requests are verified, they will appear here in their assigned batches.</p>
          </div>
        )}
      </div>
    </div>
  );
}
