import { execute } from "@/lib/db";
import { Gift, ExternalLink, Timer, Trophy } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PublicGiveaways() {
  const res = await execute("SELECT * FROM giveaways WHERE status = 'active' ORDER BY end_time ASC");
  const ended = await execute("SELECT * FROM giveaways WHERE status = 'ended' ORDER BY end_time DESC LIMIT 5");

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 pt-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
           <Gift className="w-4 h-4" />
           Live Giveaways
        </div>
        <h1 className="text-6xl font-black text-on-surface tracking-tighter">Enter to Win Premium Customs</h1>
        <p className="text-on-surface-variant max-w-2xl mx-auto text-lg font-medium opacity-60">
            Join active server giveaways directly from the portal. Winners are picked automatically by the Batch-Bot.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(res.rows.length === 0) && (
            <div className="col-span-full py-20 text-center bg-surface-container-low rounded-[3rem] border border-dashed border-outline-variant/20">
                <p className="text-on-surface-variant font-black uppercase tracking-widest text-xs">No Active Giveaways Found</p>
                <p className="text-[10px] text-on-surface-variant/40 mt-1">Check back later or follow the Discord announcements!</p>
            </div>
        )}
        
        {res.rows.map((gw: any) => (
          <div key={gw.id} className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-2xl group-hover:bg-primary/40 transition-all opacity-0 group-hover:opacity-100" />
            <div className="relative bg-white rounded-[3.5rem] p-10 border border-outline-variant/10 shadow-massive space-y-6 flex flex-col h-full hover:translate-y-[-8px] transition-transform duration-500">
               <div className="flex justify-between items-start">
                  <div className="p-4 bg-primary text-black rounded-2xl shadow-glow">
                     <Gift className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                     <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Winners</div>
                     <div className="text-2xl font-black text-on-surface">{gw.winners_count}</div>
                  </div>
               </div>

               <div className="flex-1 space-y-2">
                 <h2 className="text-3xl font-black text-on-surface tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                    {gw.prize}
                 </h2>
                 <p className="text-on-surface-variant/60 text-xs font-medium flex items-center gap-2">
                    <Timer className="w-3 h-3" />
                    Ends <span className="font-black text-primary">{new Date(gw.end_time).toLocaleString()}</span>
                 </p>
               </div>

               <div className="pt-6 border-t border-outline-variant/5 space-y-4">
                  <a 
                    href={`https://discord.com/channels/${gw.guild_id}/${gw.channel_id}/${gw.msg_id}`}
                    target="_blank"
                    className="w-full py-5 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all shadow-xl active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Teleport to Discord
                  </a>
                  <p className="text-center text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">
                    ID: {gw.id} • Must be in-server to join
                  </p>
               </div>
            </div>
          </div>
        ))}
      </div>

      {ended.rows.length > 0 && (
        <div className="space-y-8 pt-10">
           <h3 className="text-2xl font-black text-on-surface tracking-tight flex items-center gap-3">
              <Trophy className="text-secondary w-6 h-6" />
              Recently Concluded
           </h3>
           <div className="bg-white rounded-[3rem] border border-outline-variant/10 p-2 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] border-b border-outline-variant/5">
                    <th className="p-6">Prize</th>
                    <th className="p-6 text-center">Status</th>
                    <th className="p-6 text-right">Ended At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {ended.rows.map((gw: any) => (
                    <tr key={gw.id} className="group hover:bg-surface-container-low transition-colors">
                       <td className="p-6">
                          <div className="font-black text-on-surface text-sm">{gw.prize}</div>
                          <div className="text-[10px] text-on-surface-variant font-medium opacity-40 uppercase tracking-tighter">ID: {gw.id}</div>
                       </td>
                       <td className="p-6 text-center">
                          <span className="px-3 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-full text-[9px] font-black tracking-widest uppercase">
                             FINALIZED
                          </span>
                       </td>
                       <td className="p-6 text-right text-xs font-bold text-on-surface-variant">
                          {new Date(gw.end_time).toLocaleDateString()}
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
}
