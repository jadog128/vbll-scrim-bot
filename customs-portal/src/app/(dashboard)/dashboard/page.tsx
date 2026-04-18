import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import { Send, Clock, CheckCircle2, Package, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  
  // Fetch user's requests with batch info
  const requestsRes = await execute(
    `SELECT br.*, b.status as batch_status, b.released_at as batch_released_at,
     (SELECT COUNT(*) FROM batch_requests WHERE batch_id = br.batch_id) as batch_count
     FROM batch_requests br 
     LEFT JOIN batches b ON br.batch_id = b.id 
     WHERE br.discord_id = ? 
     ORDER BY br.created_at DESC`, 
    [userId]
  );
  const requests = requestsRes.rows;

  // Calculate Historical Averages for ETA (in seconds)
  const statsRes = await execute(`
    SELECT 
      (SELECT AVG(unixepoch(verified_at) - unixepoch(created_at)) FROM batch_requests WHERE verified_at IS NOT NULL) as avg_verify,
      (SELECT AVG(unixepoch(sent_at) - unixepoch(released_at)) FROM batches WHERE sent_at IS NOT NULL) as avg_send
    FROM batch_requests LIMIT 1
  `);
  const stats = statsRes.rows[0] as any;
  const avgVerify = Math.max(1, (stats?.avg_verify || 8 * 3600)) * 1000;
  const avgSend = Math.max(1, (stats?.avg_send || 2 * 24 * 3600)) * 1000;

  const getProgress = (req: any) => {
    if (req.status === 'completed' && req.batch_status === 'sent') return 100;
    if (req.status === 'completed' && req.batch_status === 'released') return 75;
    if (req.status === 'completed' && !req.batch_status) return 50; // In a batch but not released yet
    if (req.status === 'pending') return 25;
    return 10; // Pre-review
  };

  const getStageName = (req: any) => {
    if (req.status === 'completed' && req.batch_status === 'sent') return "Delivered In-Game";
    if (req.status === 'completed' && req.batch_status === 'released') return "Batch Released - Awaiting Dev";
    if (req.status === 'completed') return `In Batch #${req.batch_id} (${req.batch_count}/8)`;
    if (req.status === 'pending') return "Verified - Staff Queue";
    if (req.status === 'rejected') return "Rejected by Staff";
    return "Initial Verification";
  };

  const getETA = (req: any) => {
    if (req.status === 'completed' && req.batch_status === 'sent') return "Delivered";
    if (req.status === 'rejected') return "N/A";
    
    if (req.status === 'pre_review') {
      const createdAtStr = req.created_at.includes(' ') ? req.created_at.replace(' ', 'T') + 'Z' : req.created_at;
      const elapsed = Date.now() - new Date(createdAtStr).getTime();
      const remain = Math.max(0, avgVerify - elapsed);
      if (remain <= 0) return "Soon";
      return remain > 3600000 ? `~${Math.round(remain/3600000)}h` : `~${Math.round(remain/60000)}m`;
    }
    
    if (req.status === 'completed' && req.batch_status === 'released') {
      const releasedAtStr = req.batch_released_at.includes(' ') ? req.batch_released_at.replace(' ', 'T') + 'Z' : req.batch_released_at;
      const releasedAt = new Date(releasedAtStr).getTime();
      const elapsed = Date.now() - releasedAt;
      const remain = Math.max(0, avgSend - elapsed);
      const days = Math.round(remain / (24 * 3600000));
      return days <= 0 ? "Ready Soon" : `~${days} days`;
    }
    
    if (req.status === 'pending' || (req.status === 'completed' && !req.batch_status)) {
       return "Awaiting Batch Release";
    }
    
    return "Calculating...";
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10 relative overflow-hidden group col-span-full">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <Package className="w-20 h-20 text-primary" />
          </div>
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] mb-4">Current Queue</h3>
            <div className="text-5xl font-black text-on-surface tracking-tighter">
              {requests.length}
            </div>
            <p className="text-on-surface-variant text-sm mt-2 font-medium">Pending items in active batches</p>
          </div>
        </div>
      </div>

      {/* Requests Bento Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-3">
               <span className="material-symbols-outlined text-primary">history</span>
               Submission Timeline
            </h2>
            <button className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity">
               <RefreshCw className="w-3.5 h-3.5" />
               Live Update
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((req: any) => (
            <div key={req.id} className="bg-surface-container-lowest rounded-3xl p-6 shadow-ambient border border-white hover:border-primary/20 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-2.5 rounded-2xl ${
                  req.status === 'completed' ? 'bg-primary/10 text-primary' : 
                  req.status === 'pending' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {req.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                  ID: #{req.id.toString().slice(-4)}
                </div>
              </div>

              {req.status !== 'completed' || req.batch_status !== 'sent' ? (
                <div className="mb-4 flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full w-fit border border-primary/5">
                  <span className="text-[9px] font-black uppercase text-primary/60">ETA:</span>
                  <span className="text-[10px] font-black text-primary">{getETA(req)}</span>
                </div>
              ) : null}

              <div className="space-y-1 mb-6">
                <h4 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{req.type}</h4>
                <div className="flex items-center gap-2 mb-2">
                   <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${req.status === 'rejected' ? 'bg-error' : 'bg-primary'}`} 
                        style={{ width: `${getProgress(req)}%` }} 
                      />
                   </div>
                   <span className="text-[10px] font-black text-primary">{getProgress(req)}%</span>
                </div>
                <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">{getStageName(req)}</p>
              </div>

              <div className="pt-6 border-t border-outline-variant/10 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${req.status === 'completed' ? 'bg-primary' : 'bg-primary animate-pulse'}`}></span>
                      <span className="text-[10px] font-black uppercase tracking-tighter text-on-surface-variant">{req.status}</span>
                   </div>
                   {req.batch_id && (
                     <div className="text-[9px] font-bold text-primary flex items-center gap-1">
                        <Package className="w-2.5 h-2.5" /> Batch #{req.batch_id}
                     </div>
                   )}
                </div>
                <div className="text-[10px] font-bold text-on-surface-variant/40 italic">
                  {new Date(req.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
          
          {requests.length === 0 && (
            <div className="col-span-full py-20 bg-surface-container-low/30 rounded-[3rem] border-2 border-dashed border-outline-variant/20 flex flex-col items-center justify-center text-center space-y-4">
               <div className="w-16 h-16 rounded-3xl bg-surface-container-high flex items-center justify-center text-on-surface-variant opacity-20">
                  <Send className="w-8 h-8" />
               </div>
               <div className="space-y-1">
                  <h3 className="text-xl font-bold text-on-surface">No Active Requests</h3>
                  <p className="text-sm text-on-surface-variant font-medium">Start your first custom request using the button above.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
