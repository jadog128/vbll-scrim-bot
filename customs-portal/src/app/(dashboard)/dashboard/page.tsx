import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import { Send, Clock, CheckCircle2, Package, RefreshCw, ListFilter, History as HistoryIcon, Zap, ExternalLink, HelpCircle } from "lucide-react";
import UserDashboardLayout from "@/components/UserDashboardLayout";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  
  // Fetch user's requests with batch info
  const requestsRes = await execute(
    `SELECT br.*, b.status as batch_status, b.released_at as batch_released_at,
     (SELECT COUNT(*) FROM batch_requests WHERE batch_id = br.batch_id) as batch_count,
     (SELECT value FROM guild_settings WHERE guild_id = br.guild_id AND key = 'league_name') as league_name
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
    if (req.status === 'completed' && !req.batch_status) return 50;
    if (req.status === 'pending') return 25;
    return 10;
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

  const statsSection = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10 relative overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
           <Package className="w-40 h-40 text-primary" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4">Total Requests</h3>
            <div className="text-7xl font-black text-on-surface tracking-tighter">
              {requests.length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-secondary/5 rounded-[2.5rem] p-8 border border-secondary/10 relative overflow-hidden group hover:shadow-xl hover:shadow-secondary/5 transition-all duration-500">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
           <Zap className="w-40 h-40 text-secondary" />
        </div>
        <div className="relative z-10 space-y-4">
          <h3 className="text-xs font-black text-secondary uppercase tracking-[0.3em] mb-4">Quick Shortcuts</h3>
          <div className="grid grid-cols-2 gap-3">
             <button className="flex items-center gap-2 p-3 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-secondary/10 hover:bg-secondary hover:text-white transition-all group/btn">
                <Send className="w-3.5 h-3.5" /> New Request
             </button>
             <button className="flex items-center gap-2 p-3 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-secondary/10 hover:bg-secondary hover:text-white transition-all group/btn">
                <HelpCircle className="w-3.5 h-3.5" /> Support
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  const timelineSection = (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-4">
          <h2 className="text-2xl font-black text-on-surface flex items-center gap-4">
             <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <HistoryIcon className="w-5 h-5" />
             </div>
             Submission Timeline
          </h2>
          <div className="flex items-center gap-3">
             <button className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                <RefreshCw className="w-3 h-3" />
                Live Feed
             </button>
             <button className="p-2 bg-surface-container-low rounded-xl border border-outline-variant/10 text-on-surface-variant hover:bg-white transition-all">
                <ListFilter className="w-4 h-4" />
             </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {requests.map((req: any) => (
          <div key={req.id} className="bg-white rounded-[2.5rem] p-8 shadow-ambient border border-white hover:border-primary/20 transition-all hover:scale-[1.02] group relative">
            <div className="flex justify-between items-start mb-8">
              <div className={`p-4 rounded-[1.5rem] ${
                req.status === 'completed' ? 'bg-primary/10 text-primary shadow-lg shadow-primary/10' : 
                req.status === 'pending' ? 'bg-secondary/10 text-secondary shadow-lg shadow-secondary/10' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {req.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 bg-surface-container-lowest px-3 py-1.5 rounded-full border border-outline-variant/10">
                ID: #{req.id.toString().slice(-4)}
              </div>
            </div>

            <div className="space-y-2 mb-8">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xl font-black text-on-surface group-hover:text-primary transition-colors tracking-tight">{req.type}</h4>
                <div className="px-3 py-1 bg-surface-container-high rounded-lg text-[9px] font-black text-primary/50 uppercase tracking-[0.2em]">
                  {req.league_name || 'Legacy'}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-black text-primary uppercase tracking-widest">
                   <span>Fulfillment Progress</span>
                   <span>{getProgress(req)}%</span>
                </div>
                <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden p-0.5 border border-white shadow-inner">
                   <div 
                     className={`h-full rounded-full transition-all duration-1000 ${req.status === 'rejected' ? 'bg-error' : 'bg-gradient-to-r from-primary/80 to-primary'}`} 
                     style={{ width: `${getProgress(req)}%` }} 
                   />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-[0.1em] pt-2">{getStageName(req)}</p>
            </div>

            <div className="pt-8 border-t border-outline-variant/10 flex items-center justify-between">
              <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${req.status === 'completed' ? 'bg-primary' : 'bg-primary animate-pulse shadow-glow'}`}></div>
                    <span className="text-[11px] font-black uppercase tracking-tighter text-on-surface">{req.status}</span>
                 </div>
              </div>
              <div className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-widest">
                {new Date(req.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <div className="col-span-full py-40 bg-surface-container-low/20 rounded-[4rem] border-4 border-dashed border-outline-variant/10 flex flex-col items-center justify-center text-center space-y-6">
             <div className="w-24 h-24 rounded-[2rem] bg-surface-container-high flex items-center justify-center text-on-surface-variant/20 shadow-inner">
                <Send className="w-10 h-10" />
             </div>
             <div className="space-y-2">
                <h3 className="text-2xl font-black text-on-surface tracking-tighter">Your timeline is empty</h3>
                <p className="text-sm text-on-surface-variant font-bold uppercase tracking-widest opacity-50">Create your first request using the side menu</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="pb-20">
      <UserDashboardLayout 
        userId={userId} 
        statsSection={statsSection} 
        timelineSection={timelineSection} 
      />
    </div>
  );
}
