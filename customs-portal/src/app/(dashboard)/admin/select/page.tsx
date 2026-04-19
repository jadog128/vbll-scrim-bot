import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";
import AdminGuildSelector from "@/components/AdminGuildSelector";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSelectorPage() {
  const session = await getServerSession(authOptions);
  
  if (!(session?.user as any)?.isAdmin) {
    redirect("/dashboard");
  }

  const manageableGuilds = (session?.user as any)?.manageableGuilds || [];
  
  // Fetch guilds that have settings (bot is active)
  const activeGuildsRes = await execute("SELECT DISTINCT guild_id FROM guild_settings");
  const activeGuildIds = new Set(activeGuildsRes.rows.map((r: any) => r.guild_id));

  const guildsWithBotInfo = manageableGuilds.map((g: any) => ({
    ...g,
    hasBot: activeGuildIds.has(g.id)
  }));

  return (
    <div className="py-10">
      <AdminGuildSelector guilds={guildsWithBotInfo} />
    </div>
  );
}
