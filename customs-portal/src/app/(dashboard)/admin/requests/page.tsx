import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import { History, ShieldAlert, ListFilter, Search, Settings2 } from "lucide-react";
import AdminRequestRow from "@/components/AdminRequestRow";
import AdminBulkRequests from "@/components/AdminBulkRequests";
import AdminSearchBar from "@/components/AdminSearchBar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminRequests(props: { searchParams: Promise<{ q?: string; guild?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) redirect("/");

  const selectedGuildId = searchParams.guild;
  if (!selectedGuildId) redirect("/admin/select");

  const query = searchParams?.q || "";
  const idMatch = query.match(/^#?(\d+)$/);
  const searchId = idMatch ? parseInt(idMatch[1]) : null;

  // 1. Fetch search results (if searching) - Search ALL statuses
  let searchResults: any[] = [];
  if (query) {
    let searchSql = "SELECT * FROM batch_requests WHERE (LOWER(username) LIKE LOWER(?) OR LOWER(vrfs_id) LIKE LOWER(?)) AND guild_id = ? AND hidden_from_admin = 0";
    const params: any[] = [`%${query}%`, `%${query}%`, selectedGuildId];
    if (searchId) {
      searchSql = "SELECT * FROM batch_requests WHERE (id = ? OR LOWER(username) LIKE LOWER(?) OR LOWER(vrfs_id) LIKE LOWER(?)) AND guild_id = ? AND hidden_from_admin = 0";
      params.unshift(searchId);
    }
    searchSql += " ORDER BY created_at DESC LIMIT 100";
    const res = await execute(searchSql, params);
    searchResults = res.rows;
  }

  // 2. Fetch Active Queue (Only if NOT searching, or as secondary)
  let activeRequestsSql = "SELECT * FROM batch_requests WHERE status NOT IN ('completed', 'rejected') AND guild_id = ? AND hidden_from_admin = 0";
  const activeParams: any[] = [selectedGuildId];
  activeRequestsSql += " ORDER BY created_at DESC";
  const activeRequests = await execute(activeRequestsSql, activeParams);

  // 3. Fetch History
  let historySql = "SELECT * FROM batch_requests WHERE status IN ('completed', 'rejected') AND guild_id = ? AND hidden_from_admin = 0";
  historySql += " ORDER BY created_at DESC LIMIT 50";
  const history = await execute(historySql, [selectedGuildId]);

  // 4. Fetch Reject Presets
  const presetsRes = await execute("SELECT value FROM guild_settings WHERE guild_id = ? AND key = 'reject_presets'", [selectedGuildId]);
  const rejectPresets = presetsRes.rows.length > 0 ? (presetsRes.rows[0] as any).value.split(',').map((s: string) => s.trim()) : [];

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-1 flex items-center gap-3">
             <Link href={`/admin?guild=${selectedGuildId}`}>
                <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">arrow_back</span>
             </Link>
             Audit & Oversight
          </h2>
          <p className="text-on-surface-variant text-sm font-medium">Manage and fulfill player submissions.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <Link 
             href="/admin/batches"
             className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
           >
             <Settings2 className="w-4 h-4" />
             Manage Batches
           </Link>
           <AdminSearchBar />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Active Queue / Search Results */}
        <div className="xl:col-span-2 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-3">
                 {query ? (
                    <>
                       <Search className="w-5 h-5 text-primary" />
                       Global Search Results
                    </>
                 ) : (
                    <>
                       <ShieldAlert className="w-5 h-5 text-primary" />
                       Active Submissions
                    </>
                 )}
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-on-surface-variant/40">
                 <ListFilter className="w-3 h-3" />
                 {query ? 'Global Filter' : 'Active Only'}
              </div>
           </div>

           <div className="space-y-3">
              <AdminBulkRequests 
                requests={query ? searchResults : activeRequests.rows} 
                rejectPresets={rejectPresets} 
              />
           </div>
        </div>

        {/* Sidebar History */}
        <div className="space-y-6">
           <h3 className="text-lg font-bold text-on-surface flex items-center gap-3 px-2">
              <History className="w-5 h-5 text-on-surface-variant" />
              Recent History
           </h3>
           <div className="bg-surface-container-low rounded-[2rem] p-6 border border-outline-variant/10 space-y-4">
              {history.rows.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between gap-4 py-2 border-b border-outline-variant/5 last:border-0">
                  <div className="truncate">
                    <div className="text-sm font-bold text-on-surface truncate">{req.username}</div>
                    <div className="text-[10px] text-on-surface-variant font-medium tracking-tight uppercase">{req.type}</div>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                    req.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-error/20 text-error'
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
