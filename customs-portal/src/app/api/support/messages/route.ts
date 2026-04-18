import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";
import { sendDiscordMessage, getSettingFromDB } from "@/lib/discord";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticketId");

  if (!ticketId) return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });

  try {
    const messages = await execute(
      "SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC",
      [ticketId]
    );
    return NextResponse.json(messages.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketId, content } = await req.json();
  const isAdmin = (session.user as any).isAdmin;
  const senderId = (session.user as any).id;
  const senderName = session.user.name || "User";

  try {
    // 1. Save message
    await execute(
      "INSERT INTO ticket_messages (ticket_id, sender_id, sender_name, content, is_staff) VALUES (?, ?, ?, ?, ?)",
      [ticketId, senderId, senderName, content, isAdmin ? 1 : 0]
    );

    await execute("UPDATE batch_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [ticketId]);

    // 2. If user sent it, notify Discord
    if (!isAdmin) {
       const alertCh = await getSettingFromDB("ticket_channel");
       if (alertCh) {
          const embed = {
            title: `💬 New Web Message: Ticket #${ticketId}`,
            description: `**From:** ${senderName}\n**Message:** ${content}\n\n[Reply on Portal](https://customs-portal.vercel.app/admin/tickets)`,
            color: 0x5865f2,
            timestamp: new Date().toISOString()
          };
          await sendDiscordMessage(alertCh, { embeds: [embed] });
       }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
