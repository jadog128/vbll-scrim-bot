import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check the Bot's Health URL on Render
    const botUrl = 'https://vbll-scrim-bot.onrender.com';
    const res = await fetch(botUrl, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    
    return NextResponse.json({ online: res.ok });
  } catch (e) {
    return NextResponse.json({ online: false });
  }
}
