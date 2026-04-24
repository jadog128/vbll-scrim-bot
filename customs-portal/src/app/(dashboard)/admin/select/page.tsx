import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";
import AdminGuildSelector from "@/components/AdminGuildSelector";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSelectorPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  // 1. Fetch all distinct guild_ids from the DB
  const partneredRes = await execute("SELECT DISTINCT guild_id FROM guild_settings");
  const partneredIds = new Set(partneredRes.rows.map((r: any) => String(r.guild_id)));

  // 2. Get manageable guilds from session (already filtered in auth.ts)
  const sessionGuilds = (session?.user as any)?.manageableGuilds || [];


  const sessionGuildMap = new Map(sessionGuilds.map((g: any) => [String(g.id), g]));
  const finalGuilds: any[] = [];

  // 3. Process all guilds from DB (ensures they show up even if session sync is slow)
  partneredIds.forEach(pid => {
    const sg = sessionGuildMap.get(pid) as any;
    finalGuilds.push({
      id: pid,
      name: sg?.name || `League Instance: ${pid.substring(0, 5)}...`,
      icon: sg?.icon || null,
      hasBot: true,
      isMember: !!sg
    });
  });

  // 4. Add manageable guilds that DON'T have the bot yet
  sessionGuilds.forEach((sg: any) => {
    if (!finalGuilds.find(fg => fg.id === String(sg.id))) {
      finalGuilds.push({
        id: String(sg.id),
        name: sg.name,
        icon: sg.icon,
        hasBot: false,
        isMember: true
      });
    }
  });



  return (
    <div className="py-10">
      <AdminGuildSelector guilds={finalGuilds} />
    </div>
  );
}
