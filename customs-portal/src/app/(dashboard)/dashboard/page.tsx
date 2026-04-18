import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import { Send, Clock, CheckCircle2, Package, RefreshCw } from "lucide-react";
import RequestTrigger from "@/components/RequestTrigger";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  
  // Fetch user's requests
  const requestsRes = await execute(
    "SELECT * FROM batch_requests WHERE user_id = ? ORDER BY created_at DESC", 
    [userId]
  );
  const requests = requestsRes.rows;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10 relative overflow-hidden group">
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

        <div className="md:col-span-2 bg-surface-container-low rounded-[2.5rem] p-8 border border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-on-surface tracking-tight">Ready for a new project?</h2>
            <p className="text-on-surface-variant font-medium">Initiate a custom request flow directly in your DMs.</p>
          </div>
          <RequestTrigger type="Custom Request" />
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

              <div className="space-y-1 mb-6">
                <h4 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{req.type}</h4>
                <p className="text-sm text-on-surface-variant line-clamp-2 font-medium">{req.details || "No additional details provided."}</p>
              </div>

              <div className="pt-6 border-t border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                   <span className="text-[10px] font-black uppercase tracking-tighter text-on-surface-variant">{req.status}</span>
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
