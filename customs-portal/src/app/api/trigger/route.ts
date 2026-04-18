import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type } = await req.json();
  const userId = (session.user as any).id;

  try {
    const botRes = await fetch(`${process.env.BOT_API_URL}/start-flow`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.BOT_API_TOKEN}`
      },
      body: JSON.stringify({ userId, type })
    });

    if (botRes.ok) return NextResponse.json({ success: true });
    return NextResponse.json({ error: "Bot failed" }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: "Connection failed" }, { status: 500 });
  }
}
