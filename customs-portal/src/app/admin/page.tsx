import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { ShieldCheck, Package, Layers, Users, ExternalLink, Settings } from "lucide-react";
import AdminActions from "@/components/AdminActions";
import Link from "next/link";
import AdminExportTrigger from "@/components/AdminExportTrigger";

export const dynamic = "force-dynamic";

export default async function AdminPanel() {
  const session = await getServerSession();
  const isAdmin = (session?.user as any)?.isAdmin;
  if (!isAdmin) redirect("/");

  // Fetch Stats
  const batchesRes = await execute("SELECT COUNT(*) as count FROM batches");
  const requestsRes = await execute("SELECT COUNT(*) as count FROM batch_requests");
  const pendingRes = await execute("SELECT COUNT(*) as count FROM batch_requests WHERE status = 'pending'");

  // Fetch Recent Batches with items
  const batches = await execute("SELECT * FROM batches ORDER BY id DESC LIMIT 5");
  const batchesWithItems = await Promise.all(batches.rows.map(async (b: any) => {
    const items = await execute("SELECT * FROM batch_requests WHERE batch_id = ?", [b.id]);
    return { ...b, requests: items.rows };
  }));

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-blue-500 w-10 h-10" />
          ADMIN COMMAND CENTER
        </h1>
        <AdminActions />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard hover={false} className="border-blue-500/20 bg-blue-500/5">
          <div className="text-blue-400 text-xs font-black uppercase mb-1">Total Batches</div>
          <div className="text-4xl font-black">{(batchesRes.rows[0] as any).count}</div>
        </GlassCard>
        <GlassCard hover={false} className="border-purple-500/20 bg-purple-500/5">
          <div className="text-purple-400 text-xs font-black uppercase mb-1">Total Requests</div>
          <div className="text-4xl font-black">{(requestsRes.rows[0] as any).count}</div>
        </GlassCard>
        <GlassCard hover={false} className="border-yellow-500/20 bg-yellow-500/5">
          <div className="text-yellow-400 text-xs font-black uppercase mb-1">Pending Sync</div>
          <div className="text-4xl font-black">{(pendingRes.rows[0] as any).count}</div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Batches */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Layers className="text-white/40" />
            Live Batches
          </h2>
          <div className="space-y-4">
            {batchesWithItems.map((b: any) => (
              <GlassCard key={b.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-2">
                    Batch #{b.id}
                    <span className={`text-[10px] px-2 py-0.5 rounded ${b.status === 'released' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                      {b.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/20">
                    {b.released_at ? new Date(b.released_at).toLocaleString() : 'Processing...'}
                  </div>
                </div>

                <div className="space-y-2">
                  {b.requests.map((r: any) => (
                    <div key={r.id} className="text-xs flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                      <span className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-white/20" />
                        {r.username} <span className="text-white/30">({r.vrfs_id})</span>
                      </span>
                      <span className="font-mono text-blue-400/80">{r.type}</span>
                    </div>
                  ))}
                  {b.requests.length === 0 && <div className="text-xs text-white/20 italic p-2">Waitings for items...</div>}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Global Controls */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="text-white/40" />
            System Management
          </h2>
          <GlassCard className="grid grid-cols-1 gap-3">
             <Link href="/admin/requests" className="w-full">
                <GlassButton className="w-full justify-start gap-3">
                   <Package className="w-5 h-5 text-blue-400" />
                   Review Audit Logs
                </GlassButton>
             </Link>
             <Link href="/admin/config" className="w-full">
                <GlassButton className="w-full justify-start gap-3">
                   <ShieldCheck className="w-5 h-5 text-purple-400" />
                   Bot Configuration
                </GlassButton>
             </Link>
             <GlassButton variant="secondary" className="w-full justify-start gap-3">
                <ExternalLink className="w-5 h-5 text-white/40" />
                Go to Bot Channel
             </GlassButton>
          </GlassCard>

          <div className="mt-8 p-6 rounded-3xl border border-white/5 bg-mesh-alt bg-white/2 flex flex-col items-center text-center space-y-3">
             <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                <Layers className="text-blue-400 w-8 h-8" />
             </div>
             <h3 className="font-black">BATCH CONSOLIDATION</h3>
             <p className="text-sm text-white/30">Generate a report of all batches for the shipping developers.</p>
             <AdminExportTrigger />
          </div>
        </div>
      </div>
    </div>
  );
}
