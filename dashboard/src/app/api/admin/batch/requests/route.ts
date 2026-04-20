import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuth } from '@/lib/auth';
import { run, all, get } from '@/lib/db';
import { sendDiscordDM, sendDiscordMessage, deleteDiscordMessage } from '@/lib/discord';

// GET: Fetch batch requests (with status filtering) or settings
export async function GET(req: Request) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const filter = searchParams.get('filter');

  try {
    if (type === 'settings') {
      const rows = await all("SELECT key, value FROM batch_settings");
      const settings = Object.fromEntries(rows.map((row: any) => [row.key, row.value]));
      return NextResponse.json(settings);
    }

    const gid = "1286206719847960670"; // Default Guild
    let sql = "";
    if (filter === 'pending') {
        sql = "SELECT * FROM batch_requests WHERE status IN ('pre_review', 'pending', 'approved') AND (hidden_from_admin = 0 OR hidden_from_admin IS NULL) AND (guild_id = ? OR guild_id IS NULL) ORDER BY id ASC";
    } else {
        sql = "SELECT * FROM batch_requests WHERE (hidden_from_admin = 0 OR hidden_from_admin IS NULL) AND (guild_id = ? OR guild_id IS NULL) ORDER BY id DESC LIMIT 100";
    }
    
    const requests = await all(sql, [gid]);
    return NextResponse.json(requests);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Review requests OR update settings
export async function POST(req: Request) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    
    if (body.type === 'settings') {
      const { key, value } = body;
      await run('INSERT OR REPLACE INTO batch_settings (key, value) VALUES (?, ?)', [key, value]);
      return NextResponse.json({ success: true });
    }

    const { requestId, action } = body;
    let status = 'pending';
    const originalReq = await get('SELECT * FROM batch_requests WHERE id = ?', [requestId]) as any;
    if (!originalReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    if (action === 'approve') status = 'approved';
    else if (action === 'complete') status = 'completed';
    else if (action === 'reject') status = 'rejected';
    else if (action === 'verify') status = 'pending';
    
    // 1. Critical DB Update
    await run('UPDATE batch_requests SET status = ?, staff_id = ? WHERE id = ?', [status, session.user.id, requestId]);

    // 2. Direct Discord Sync (Non-blocking)
    try {
        const userId = originalReq.discord_id;
        const type = originalReq.type;

        // --- DM NOTIFICATION ---
        const embed = {
            title: `🆕 Order Update: #${requestId}`,
            description: `Your request for a **${type.toUpperCase()}** has been **${status === 'pending' && action === 'verify' ? 'PASSED VERIFICATION' : status.toUpperCase()}**.`,
            color: status === 'completed' ? 0x00f5a0 : status === 'rejected' ? 0xff4d4d : 0x5865f2,
            timestamp: new Date().toISOString()
        };
        
        await sendDiscordDM(userId, { embeds: [embed] });

        // --- QUEUE MANAGEMENT ---
        if (action === 'verify') {
            // Delete message from pre-review
            if (originalReq.ch_id && originalReq.msg_id) {
                await deleteDiscordMessage(originalReq.ch_id, originalReq.msg_id);
            }

            // Post to review channel
            const settingsRows = await all("SELECT key, value FROM batch_settings");
            const settings = Object.fromEntries(settingsRows.map((r: any) => [r.key, r.value]));
            const reviewChId = settings.review_channel;

            if (reviewChId) {
                const queueEmbed = {
                    title: `📥 Queue: ${type} (#${requestId})`,
                    description: `**Player:** <@${userId}> \n**Username:** ${originalReq.username}\n**VRFS ID:** ${originalReq.vrfs_id}\n**Proof:** [Message Link](${originalReq.proof_url})`,
                    color: 0x5865f2,
                    timestamp: new Date().toISOString()
                };
                const msg = await sendDiscordMessage(reviewChId, { embeds: [queueEmbed] });
                if (msg?.id) {
                    await run("UPDATE batch_requests SET msg_id = ?, ch_id = ? WHERE id = ?", [msg.id, reviewChId, requestId]);
                }
            }
        } else if (action === 'reject' || action === 'complete') {
            // Cleanup existing messages
            if (originalReq.ch_id && originalReq.msg_id) {
                await deleteDiscordMessage(originalReq.ch_id, originalReq.msg_id);
            }
        }
    } catch (e) {
      console.error('Discord sync failed:', e);
    }

    return NextResponse.json({ success: true, newStatus: status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
