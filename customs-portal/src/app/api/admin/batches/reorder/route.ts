import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const botHost = process.env.BOT_SERVER_HOST || process.env.BOT_SERVER_IP || "localhost:3000";
    const botToken = process.env.WEB_API_TOKEN || "vbll_batch_v2_secret_key";
    
    // Trigger Waterfall on Bot
    const res = await fetch(`http://${botHost}/reorder`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${botToken}` }
    });

    if (res.ok) return NextResponse.json({ success: true });
    else {
      const text = await res.text().catch(() => "Waterfall failed");
      try {
        const data = JSON.parse(text);
        return NextResponse.json(data, { status: 500 });
      } catch (e) {
        return NextResponse.json({ error: text }, { status: 500 });
      }
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
