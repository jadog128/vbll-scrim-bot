import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import AdminGuildSelector from "@/components/AdminGuildSelector";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSelectorPage() {
  const session = await getServerSession(authOptions);
  
  if (!(session?.user as any)?.isAdmin && !(session?.user as any)?.manageableGuilds?.length) {
    redirect("/dashboard");
  }

  const manageableGuilds = (session?.user as any)?.manageableGuilds || [];
  
  return (
    <div className="py-10">
      <AdminGuildSelector guilds={manageableGuilds} />
    </div>
  );
}
