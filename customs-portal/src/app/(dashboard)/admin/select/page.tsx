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

  // 2. Get manageable guilds from session to see which ones the user is actually in
  const rawGuilds = (session?.user as any)?.manageableGuilds || [];
  // Filter guilds where user has Administrator (0x8) OR Manage Server (0x20)
  const sessionGuilds = rawGuilds.filter((g: any) => {
    const p = BigInt(g.permissions);
    return (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20);
  });

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
