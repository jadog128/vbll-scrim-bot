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

    // Get current info for notification and fallback
    const currentRes = await execute("SELECT vrfs_id, discord_id, status, batch_id FROM batch_requests WHERE id = ?", [id]);
    const current = currentRes.rows[0] as any;
    if (!current) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    // Use current values as fallback if not provided
    const newVrfsId = vrfs_id !== undefined ? vrfs_id : current.vrfs_id;
    const newStatus = status !== undefined ? status : current.status;
    let newBatchId = current.batch_id;
    if (batch_id === "") newBatchId = null;
    else if (batch_id !== undefined) newBatchId = (parseInt(batch_id) || null);

    await execute(
      "UPDATE batch_requests SET vrfs_id = ?, status = ?, batch_id = ? WHERE id = ?", 
      [newVrfsId, newStatus, newBatchId, id]
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
    
    // Notify Bot to Sync Discord Embed & Trigger Waterfall
    try {
      const botIp = process.env.BOT_SERVER_IP || "localhost";
      const botToken = process.env.WEB_API_TOKEN || "vbll_batch_secret";
      
      // Sync the request embed
      await fetch(`http://${botIp}:3000/sync-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${botToken}` },
        body: JSON.stringify({ requestId: id })
      }).catch(e => console.error("Bot sync failed", e));

      // Trigger Waterfall (to fill gaps)
      await fetch(`http://${botIp}:3000/reorder`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${botToken}` }
      }).catch(e => console.error("Reorder failed", e));
    } catch(e) {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Update API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
