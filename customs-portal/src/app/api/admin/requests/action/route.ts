import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";
import { deleteDiscordMessage, sendDiscordMessage, getSettingFromDB, sendDiscordDM } from "@/lib/discord";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId, action, reason } = await req.json();

  if (!requestId || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // 0. Fetch current request info for Discord sync
    const currentReqRes = await execute("SELECT * FROM batch_requests WHERE id = ?", [requestId]);
    if (currentReqRes.rows.length === 0) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    const currentReq = currentReqRes.rows[0] as any;

    if (action === "approve") {
      await execute("UPDATE batch_requests SET status = 'pending', verified_at = CURRENT_TIMESTAMP WHERE id = ?", [requestId]);
      
      // Sync Discord: Delete from pre-review, send to main review channel
      try {
          if (currentReq.msg_id && currentReq.ch_id) {
              await deleteDiscordMessage(currentReq.ch_id, currentReq.msg_id);
          }

          const qId = await getSettingFromDB('review_channel');
          if (qId) {
              const embed = {
                  title: `📥 Queue: ${currentReq.type} (#${requestId})`,
                  description: `**Player:** <@${currentReq.discord_id}>\n**VRFS ID:** ${currentReq.vrfs_id}\n**Proof:** [Message Link](${currentReq.proof_url})\n\n*(Handled via Web Portal)*`,
                  color: 0x5865f2,
                  timestamp: new Date().toISOString()
              };
              const newMsg = await sendDiscordMessage(qId, { embeds: [embed] });
              if (newMsg) {
                  await execute("UPDATE batch_requests SET msg_id = ?, ch_id = ? WHERE id = ?", [newMsg.id, qId, requestId]);
              }
          }
          
          // DM User
          await sendDiscordDM(currentReq.discord_id, {
            embeds: [{
                title: "✅ Verified!",
                description: `Your **${currentReq.type}** request (#${requestId}) has been verified and added to the official queue.`,
                color: 0x00f5a0
            }]
          });
      } catch (discordErr) {
          console.error("Discord sync failed during approve:", discordErr);
      }

    } else if (action === "deny") {
      await execute("UPDATE batch_requests SET status = 'rejected' WHERE id = ?", [requestId]);
      
      try {
          if (currentReq.msg_id && currentReq.ch_id) {
              await deleteDiscordMessage(currentReq.ch_id, currentReq.msg_id);
          }

          // DM User
          await sendDiscordDM(currentReq.discord_id, {
            embeds: [{
                title: "❌ Rejected",
                description: `Your custom request (#${requestId}) was rejected by staff.${reason ? `\n\n**Reason:** ${reason}` : ""}`,
                color: 0xff4d4d
            }]
          });
      } catch (discordErr) {
          console.error("Discord sync failed during deny:", discordErr);
      }

    } else if (action === "fulfill") {
      // 1. Mark as completed
      await execute("UPDATE batch_requests SET status = 'completed', staff_id = ? WHERE id = ?", [
        (session?.user as any)?.id || "admin",
        requestId
      ]);

      try {
          // Sync Discord: Delete from queue
          if (currentReq.msg_id && currentReq.ch_id) {
              await deleteDiscordMessage(currentReq.ch_id, currentReq.msg_id);
          }

          // DM User
          await sendDiscordDM(currentReq.discord_id, {
            embeds: [{
                title: `🆕 Request Update: #${requestId}`,
                description: `Your **${currentReq.type}** has been marked as **completed** and assigned to a batch.`,
                color: 0x00f5a0
            }]
          });
      } catch (discordErr) {
          console.error("Discord sync failed during fulfill:", discordErr);
      }

      // 2. Assign to an open batch (matching bot logic)
      let batchRes = await execute("SELECT id FROM batches WHERE status = 'open' LIMIT 1");
      let batchId;

      if (batchRes.rows.length === 0) {
        await execute("INSERT INTO batches (status) VALUES ('open')");
        const newBatch = await execute("SELECT last_insert_rowid() as id");
        batchId = (newBatch.rows[0] as any).id;
      } else {
        batchId = (batchRes.rows[0] as any).id;
      }

      await execute("UPDATE batch_requests SET batch_id = ? WHERE id = ?", [batchId, requestId]);

      // 3. Check if batch is full (8 items)
      const countRes = await execute("SELECT COUNT(*) as count FROM batch_requests WHERE batch_id = ?", [batchId]);
      if ((countRes.rows[0] as any).count >= 8) {
        await execute("UPDATE batches SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE id = ?", [batchId]);
        
        try {
            // Notify Discord of full batch release
            const relId = await getSettingFromDB('release_channel');
            if (relId) {
                const reqs = await execute("SELECT username, vrfs_id, type, proof_url FROM batch_requests WHERE batch_id = ?", [batchId]);
                const list = reqs.rows.map((r: any, i) => `**${i+1}.** ${r.username} — ID: \`${r.vrfs_id}\` (${r.type}) [Proof](${r.proof_url})`).join('\n');
                const embed = {
                    title: `🚀 Batch #${batchId} FULL & RELEASED`,
                    description: `The following 8 requests are ready for processing:\n\n${list}\n\n*(Released via Web Portal)*`,
                    color: 0x00f5a0,
                    timestamp: new Date().toISOString()
                };
                await sendDiscordMessage(relId, { embeds: [embed] });
            }
        } catch (discordErr) {
            console.error("Discord sync failed during batch release:", discordErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
