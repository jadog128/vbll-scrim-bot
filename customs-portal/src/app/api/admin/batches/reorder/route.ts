import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const botIp = process.env.BOT_SERVER_IP || "localhost";
    const botToken = process.env.WEB_API_TOKEN || "vbll_batch_secret";
    
    // Trigger Waterfall on Bot
    const res = await fetch(`http://${botIp}:3000/reorder`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${botToken}` }
    });

    if (res.ok) return NextResponse.json({ success: true });
    else return NextResponse.json({ error: "Waterfall failed" }, { status: 500 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
