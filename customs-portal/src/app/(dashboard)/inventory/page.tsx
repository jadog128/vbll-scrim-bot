import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import { Package, Search, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  
  // Fetch only COMPLETED requests (Inventory)
  const itemsRes = await execute(
    "SELECT * FROM batch_requests WHERE discord_id = ? AND status = 'completed' ORDER BY created_at DESC", 
    [userId]
  );
  const items = itemsRes.rows;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-on-surface tracking-tighter">My Inventory</h1>
          <p className="text-on-surface-variant font-medium">Collection of your fulfilled VBLL customs.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search collection..." 
                className="pl-11 pr-6 py-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium w-full md:w-64"
              />
           </div>
           <button className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:bg-white transition-colors">
              <Filter className="w-5 h-5 text-on-surface-variant" />
           </button>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item: any) => (
          <div key={item.id} className="bg-white rounded-[2rem] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.02)] border border-white hover:border-primary/20 transition-all hover:-translate-y-1 group">
            <div className="aspect-square bg-surface-container-low rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden">
               <Package className="w-12 h-12 text-primary/20 group-hover:scale-110 group-hover:text-primary/40 transition-all duration-500" />
               <div className="absolute top-3 right-3 px-2 py-1 bg-white/80 backdrop-blur-md rounded-lg text-[10px] font-black text-primary border border-white shadow-sm">
                  #{item.batch_id ? `BATCH-${item.batch_id}` : "CORE"}
               </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-60">{item.type}</div>
              <h3 className="text-lg font-bold text-on-surface leading-tight truncate">{item.username}'s Custom</h3>
              <p className="text-[11px] font-bold text-on-surface-variant opacity-60 truncate">VRFS ID: {item.vrfs_id}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-primary/5 flex items-center justify-between">
               <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:opacity-70 transition-opacity">
                  View Details
               </button>
               <div className="text-[9px] font-medium text-on-surface-variant/40">
                  {new Date(item.created_at).toLocaleDateString()}
               </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-4 bg-surface-container-low/30 rounded-[3rem] border-2 border-dashed border-outline-variant/20">
             <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant/20">
                <Package className="w-10 h-10" />
             </div>
             <div className="space-y-1">
                <h3 className="text-xl font-bold text-on-surface">Your collection is empty</h3>
                <p className="text-sm text-on-surface-variant font-medium"> Fulfilled requests will automatically appear here.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
