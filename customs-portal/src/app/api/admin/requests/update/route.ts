import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";
import { sendDiscordDM } from "@/lib/discord";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, vrfs_id, status, batch_id } = await req.json();

    // Get current info for notification
    const currentRes = await execute("SELECT vrfs_id, discord_id, status FROM batch_requests WHERE id = ?", [id]);
    const current = currentRes.rows[0] as any;

    await execute(
      "UPDATE batch_requests SET vrfs_id = ?, status = ?, batch_id = ? WHERE id = ?", 
      [vrfs_id, status, batch_id === "" ? null : (parseInt(batch_id) || null), id]
    );

    // Notify User if anything changed
    if (current && current.discord_id && (current.vrfs_id !== vrfs_id || current.status !== status)) {
       try {
         const dmResult = await sendDiscordDM(current.discord_id, {
           embeds: [{
             title: "📝 Request Updated",
             description: `Your request **#${id}** has been updated by staff.\n\n**New VRFS ID:** \`${vrfs_id}\`\n**New Status:** \`${status.toUpperCase()}\``,
             color: 0x5865f2,
             timestamp: new Date().toISOString()
           }]
         });
         console.log(`DM attempted for user ${current.discord_id}, result:`, dmResult);
       } catch(e) {
         console.error("DM failed:", e);
       }
    } else if (!current || !current.discord_id) {
       console.warn(`Cannot send DM: current request or discord_id missing for ID ${id}`);
    }
    
    // Log the action
    if (session?.user) {
      await execute(
        "INSERT INTO staff_logs (staff_id, staff_name, action, target_id, details) VALUES (?,?,?,?,?)",
        [(session.user as any).id, (session.user as any).username || session.user.name || "Staff", "WEB_EDIT", id.toString(), `Modified VRFS/Status/Batch`]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Update API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
