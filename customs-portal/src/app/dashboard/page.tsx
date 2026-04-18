import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import { Send, Clock, CheckCircle2, Package, Timer, Sync } from "lucide-react";
import RequestTrigger from "@/components/RequestTrigger";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getServerSession();
  if (!session?.user) redirect("/api/auth/signin");

  const userId = (session.user as any).id;

  // Fetch user's requests
  const result = await execute(
    "SELECT * FROM batch_requests WHERE discord_id = ? ORDER BY id DESC",
    [userId]
  );
  const requests = result.rows;

  // Find most recent active batch for the hero section
  const activeBatch = requests.find((r: any) => r.batch_id && r.status !== 'completed');
  let progress = 0;
  if (activeBatch) {
    const batchRes = await execute("SELECT status FROM batches WHERE id = ?", [activeBatch.batch_id]);
    if (batchRes.rows[0]?.status === 'released') progress = 85; // Released is close to done
    else progress = 68; // Pending is processing
  }

  // Fetch available options
  const optionsResult = await execute("SELECT name FROM batch_options");
  const options = optionsResult.rows.map(r => r.name as string);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Heading */}
      <div>
        <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-1">Active Batches</h2>
        <p className="text-on-surface-variant text-sm font-medium">Tracking processing status across your current requests.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Hero Card: Current Batch Progress */}
          {activeBatch ? (
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-ambient relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                      Processing
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium">Batch ID: #BQ-{activeBatch.batch_id}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-on-surface tracking-tight uppercase">Current Work Queue</h3>
                </div>
                <div className="text-right">
                  <span className="block text-3xl font-extrabold text-primary tracking-tighter">{progress}%</span>
                  <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Progress</span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="relative z-10 mb-6">
                <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full relative" style={{ width: `${progress}%` }}>
                    <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 text-sm font-medium">
                  <span className="text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    Est. Sync: 15 mins
                  </span>
                  <span className="text-primary font-semibold">Verification stage active</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-3xl p-12 text-center shadow-ambient border-2 border-dashed border-outline-variant/20 flex flex-col items-center">
              <Package className="w-12 h-12 text-on-surface-variant opacity-20 mb-4" />
              <h3 className="text-xl font-bold text-on-surface opacity-40">No Active Batch</h3>
              <p className="text-sm text-on-surface-variant max-w-xs mx-auto mt-1">Start a new request to see your batch progress live.</p>
            </div>
          )}

          {/* Request Queue List */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-ambient">
            <h4 className="text-lg font-bold text-on-surface mb-6">Active Queue</h4>
            <div className="space-y-3">
              {requests.slice(0, 5).map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container-high transition-colors group relative overflow-hidden">
                  {req.status === 'pending' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>}
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      req.status === 'completed' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-highest text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined text-[20px] icon-fill">
                        {req.status === 'completed' ? 'check_circle' : 'hourglass_empty'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-on-surface">{req.type}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">#{req.id} • {req.status}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                     req.status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-on-surface-variant/10 text-on-surface-variant'
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
           <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10">
              <h4 className="text-xs font-bold text-on-surface mb-4 uppercase tracking-wider">New Request</h4>
              <p className="text-xs text-on-surface-variant mb-4 font-medium leading-relaxed">
                Select an item to begin the verification flow.
              </p>
              <div className="space-y-2">
                {options.map(opt => <RequestTrigger key={opt} type={opt} />)}
              </div>
           </div>

           <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-ambient flex flex-col">
              <h4 className="text-lg font-bold text-on-surface mb-6">Recent History</h4>
              <div className="space-y-5">
                {requests.slice(5, 10).map((req: any) => (
                  <div key={req.id} className="relative pl-6 pb-2 border-l-2 border-surface-container-high last:border-transparent">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface border-2 border-primary-fixed-dim"></div>
                    <p className="text-sm font-semibold text-on-surface mb-1">{req.type}</p>
                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest opacity-40">
                      <span>{req.status}</span>
                      <span className="px-2 font-light">|</span>
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
