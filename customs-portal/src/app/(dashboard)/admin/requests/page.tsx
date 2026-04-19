import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import { History, ShieldAlert, ListFilter, Search } from "lucide-react";
import AdminRequestRow from "@/components/AdminRequestRow";
import AdminSearchBar from "@/components/AdminSearchBar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminRequests(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) redirect("/");

  const query = searchParams?.q || "";
  const idMatch = query.match(/^#?(\d+)$/);
  const searchId = idMatch ? parseInt(idMatch[1]) : null;

  // Fetch active requests
  let activeRequestsSql = "SELECT * FROM batch_requests WHERE status != 'completed' AND status != 'rejected'";
  const activeParams: any[] = [];

  if (query) {
    if (searchId) {
      activeRequestsSql += " AND (LOWER(username) LIKE LOWER(?) OR LOWER(vrfs_id) LIKE LOWER(?) OR id = ?)";
      activeParams.push(`%${query}%`, `%${query}%`, searchId);
    } else {
      activeRequestsSql += " AND (LOWER(username) LIKE LOWER(?) OR LOWER(vrfs_id) LIKE LOWER(?))";
      activeParams.push(`%${query}%`, `%${query}%`);
    }
  }
  activeRequestsSql += " ORDER BY created_at DESC";

  const activeRequests = await execute(activeRequestsSql, activeParams);

  // Fetch recently completed for history
  let historySql = "SELECT * FROM batch_requests WHERE (status = 'completed' OR status = 'rejected')";
  const historyParams: any[] = [];
  
  if (query) {
    if (searchId) {
       historySql += " AND (LOWER(username) LIKE LOWER(?) OR LOWER(vrfs_id) LIKE LOWER(?) OR id = ?)";
       historyParams.push(`%${query}%`, `%${query}%`, searchId);
    } else {
       historySql += " AND (LOWER(username) LIKE LOWER(?) OR LOWER(vrfs_id) LIKE LOWER(?))";
       historyParams.push(`%${query}%`, `%${query}%`);
    }
  }
  historySql += " ORDER BY created_at DESC";
  if (!query) historySql += " LIMIT 25";
  
  const history = await execute(historySql, historyParams);

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-1 flex items-center gap-3">
             <Link href="/admin">
                <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">arrow_back</span>
             </Link>
             Audit & Oversight
          </h2>
          <p className="text-on-surface-variant text-sm font-medium">Manage and fulfill player submissions.</p>
        </div>
        
        <AdminSearchBar />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Active Queue */}
        <div className="xl:col-span-2 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-3">
                 <ShieldAlert className="w-5 h-5 text-primary" />
                 Active Submissions
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-on-surface-variant/40">
                 <ListFilter className="w-3 h-3" />
                 All Categories
              </div>
           </div>

           <div className="space-y-3">
              {activeRequests.rows.map((req: any) => (
                <AdminRequestRow key={req.id} request={req} />
              ))}
              {activeRequests.rows.length === 0 && (
                <div className="py-20 text-center bg-surface-container-low/30 rounded-3xl border border-dashed border-outline-variant/10">
                   <p className="text-on-surface-variant font-medium">No active submissions in queue.</p>
                </div>
              )}
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
