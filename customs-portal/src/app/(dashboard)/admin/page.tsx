import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import { ShieldCheck, Package, Layers, Users, ExternalLink, Settings, BarChart3, Radio } from "lucide-react";
import AdminActions from "@/components/AdminActions";
import Link from "next/link";
import AdminExportTrigger from "@/components/AdminExportTrigger";

export const dynamic = "force-dynamic";

export default async function AdminPanel() {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.isAdmin;
  if (!isAdmin) redirect("/");

  // Fetch Stats
  const batchesRes = await execute("SELECT COUNT(*) as count FROM batches");
  const requestsRes = await execute("SELECT COUNT(*) as count FROM batch_requests");
  
  // Fetch Recent Batches with items
  const batches = await execute("SELECT * FROM batches ORDER BY id DESC LIMIT 5");
  const batchesWithItems = await Promise.all(batches.rows.map(async (b: any) => {
    const items = await execute("SELECT * FROM batch_requests WHERE batch_id = ?", [b.id]);
    return { ...b, requests: items.rows };
  }));

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-1 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">admin_panel_settings</span>
            Command Center
          </h2>
          <p className="text-on-surface-variant text-sm font-medium">Global request oversight and batch deployment.</p>
        </div>
        <AdminActions />
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 group hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">layers</span>
            </div>
            <div className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Active Jobs</div>
          </div>
          <div className="text-4xl font-black text-primary">{(batchesRes.rows[0] as any).count}</div>
          <p className="text-xs text-on-surface-variant mt-2 font-medium">Successfully aggregated batches</p>
        </div>

        <div className="bg-secondary/5 rounded-3xl p-6 border border-secondary/10 group hover:border-secondary/30 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">group</span>
            </div>
            <div className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Player Volume</div>
          </div>
          <div className="text-4xl font-black text-secondary">{(requestsRes.rows[0] as any).count}</div>
          <p className="text-xs text-on-surface-variant mt-2 font-medium">Total registered requests</p>
        </div>

        <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 group hover:border-outline-variant/30 transition-all">
          <div className="flex items-center gap-4 mb-4">
             <div className="relative w-12 h-12 rounded-full border-4 border-surface-container-highest flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                   <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="85, 100" stroke-width="4"></path>
                </svg>
                <Radio className="w-4 h-4 text-primary animate-pulse" />
             </div>
             <div>
                <p className="text-xs font-black text-on-surface uppercase tracking-widest">System Health</p>
                <div className="text-2xl font-black text-primary">OPTIMAL</div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">stacks</span>
            Recent Deployments
          </h2>
          <div className="space-y-4">
            {batchesWithItems.map((b: any) => (
              <div key={b.id} className="bg-surface-container-lowest rounded-3xl p-6 shadow-ambient border border-white space-y-4 hover:translate-y-[-2px] transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Batch Instance</div>
                    <div className="font-bold text-primary">#VER-BATCH-{b.id}</div>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm ${
                    b.status === 'released' ? 'bg-primary text-white' : 'bg-secondary-container text-on-secondary-container'
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div className="bg-surface-container-low rounded-2xl p-4 space-y-2">
                  {b.requests.map((r: any) => (
                    <div key={r.id} className="text-xs flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <Users className="w-3 h-3 text-on-surface-variant/40" />
                        {r.username}
                      </span>
                      <span className="font-bold text-primary/60">{r.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">settings_suggest</span>
            Management Suite
          </h2>
          <div className="bg-surface-container-lowest rounded-3xl p-2 shadow-ambient border border-white grid grid-cols-1 gap-1">
              <Link href="/admin/requests">
                <button className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-surface-container-high transition-colors group text-left">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                         <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="">
                         <div className="text-sm font-bold">Audit & Oversight</div>
                         <div className="text-[10px] text-on-surface-variant font-medium">View full command logs</div>
                      </div>
                   </div>
                   <span className="material-symbols-outlined text-on-surface-variant opacity-20 group-hover:opacity-100 transition-opacity">arrow_forward_ios</span>
                </button>
             </Link>
          </div>

          <div className="mt-8 bg-gradient-to-br from-primary to-primary-container rounded-[2.5rem] p-8 text-on-primary shadow-floating flex flex-col items-center text-center space-y-4">
             <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <span className="material-symbols-outlined text-3xl">download_done</span>
             </div>
             <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight uppercase">Batch Consolidation</h3>
                <p className="text-sm text-primary-fixed-dim/80 max-w-xs">Generate the official report for production developers.</p>
             </div>
             <AdminExportTrigger />
          </div>
        </div>
      </div>
    </div>
  );
}
