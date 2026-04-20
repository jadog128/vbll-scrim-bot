import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import { Package, Zap, Send, HelpCircle } from "lucide-react";
import UserDashboardLayout from "@/components/UserDashboardLayout";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  
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
  const initialRequests = requestsRes.rows;

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
              {initialRequests.length}
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

  return (
    <div className="pb-20">
      <UserDashboardLayout 
        userId={userId} 
        statsSection={statsSection} 
        requests={initialRequests}
      />
    </div>
  );
}
