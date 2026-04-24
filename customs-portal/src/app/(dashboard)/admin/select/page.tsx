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


  const finalGuilds: any[] = [];

  // 3. Only process guilds that are in the user's session AND in the database
  sessionGuilds.forEach((sg: any) => {
    if (partneredIds.has(String(sg.id))) {
      finalGuilds.push({
        id: sg.id,
        name: sg.name,
        icon: sg.icon,
        hasBot: true,
        isMember: true
      });
    }
  });

  // 4. Optionally add other manageable guilds that DON'T have the bot yet
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
