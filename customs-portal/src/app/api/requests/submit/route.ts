import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";
import { sendDiscordMessage, getSettingFromDB } from "@/lib/discord";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, vrfsId, proofUrl } = await req.json();

  if (!type || !vrfsId || !proofUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // 1. Insert into database
    await execute(
      "INSERT INTO batch_requests (discord_id, username, vrfs_id, type, proof_url, status) VALUES (?, ?, ?, ?, ?, ?)",
      [(session.user as any).id, session.user.name, vrfsId, type, proofUrl, "pre_review"]
    );

    const newReqRes = await execute("SELECT last_insert_rowid() as id");
    const requestId = (newReqRes.rows[0] as any).id;

    // 2. Fetch pre-review channel setting
    const preId = await getSettingFromDB("pre_review_channel");
    if (preId) {
        const embed = {
            title: `🔍 Pre-Review: ${type.toUpperCase()} (#${requestId})`,
            description: `**Player:** <@${(session.user as any).id}> \n**VRFS ID:** ${vrfsId} \n\n**Proof Link:** ${proofUrl}\n\n*(Submitted via Web Portal)*`,
            color: 0xFFA500,
            timestamp: new Date().toISOString()
        };
        
        // This button logic in the bot uses IDs for listeners, so we might just send pure embed
        // to avoid mismatching component versions, or send similar buttons.
        const discordMsg = await sendDiscordMessage(preId, { embeds: [embed] });
        if (discordMsg) {
            await execute("UPDATE batch_requests SET msg_id = ?, ch_id = ? WHERE id = ?", [discordMsg.id, preId, requestId]);
        }
    }

    return NextResponse.json({ success: true, requestId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
