import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { Clock, CheckCircle2, Package, Send, AlertCircle } from "lucide-react";
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

  // Fetch available options
  const optionsResult = await execute("SELECT name FROM batch_options");
  const options = optionsResult.rows.map(r => r.name as string);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">DASHBOARD</h1>
          <p className="text-white/50">Welcome back, {session.user.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* New Request Section */}
        <GlassCard className="lg:col-span-1 space-y-6">
          <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-sm">
            <Send className="w-4 h-4" />
            New Request
          </div>
          <p className="text-white/50 text-sm">
            Ready for some new gear? Select an item below to trigger the verification flow in your Discord DMs.
          </p>
          <div className="space-y-3">
            {options.length > 0 ? (
              options.map(opt => (
                <RequestTrigger key={opt} type={opt} />
              ))
            ) : (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                No custom options are currently configured.
              </div>
            )}
          </div>
        </GlassCard>

        {/* Status Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-white/40 font-bold uppercase tracking-wider text-sm">
            <Clock className="w-4 h-4" />
            Your Request History
          </div>

          <div className="space-y-4">
            {requests.length > 0 ? (
              requests.map((req: any) => (
                <GlassCard key={req.id} className="flex items-center justify-between py-4 group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center border",
                      req.status === 'completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      req.status === 'rejected' ? "bg-red-500/10 border-red-500/20 text-red-400" :
                      "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    )}>
                      {req.status === 'completed' ? <CheckCircle2 /> : <Clock />}
                    </div>
                    <div>
                      <div className="font-bold">{req.type}</div>
                      <div className="text-xs text-white/30 flex gap-2">
                        <span>#{req.id}</span>
                        <span>•</span>
                        <span>ID: {req.vrfs_id}</span>
                        {req.batch_id && <span className="text-blue-400">• Batch #{req.batch_id}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-xs font-black uppercase px-2 py-1 rounded bg-white/5 border border-white/10",
                      req.status === 'completed' ? "text-emerald-400" : 
                      req.status === 'pending' ? "text-blue-400" : "text-white/40"
                    )}>
                      {req.status}
                    </div>
                    <div className="text-[10px] text-white/20 mt-1">
                      {new Date(req.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </GlassCard>
              ))
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/20">No requests found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function for conditional classes in server component
function cn(...args: any[]) { return args.filter(Boolean).join(" "); }
