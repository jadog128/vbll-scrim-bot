import { NextResponse } from 'next/server';

export async function GET() {
  const status = {
    VCC_DISCORD_CLIENT_ID: !!process.env.VCC_DISCORD_CLIENT_ID,
    VCC_DISCORD_CLIENT_SECRET: !!process.env.VCC_DISCORD_CLIENT_SECRET,
    VCC_NEXTAUTH_URL: !!process.env.VCC_NEXTAUTH_URL,
    VCC_NEXTAUTH_SECRET: !!process.env.VCC_NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    DISCORD_CLIENT_ID: !!process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: !!process.env.DISCORD_CLIENT_SECRET,
  };

  return NextResponse.json({
    message: "VCC Diagnostic Check",
    env_status: status,
    instructions: "If any VCC_ variables are false, please add them to Vercel and REDEPLOY."
  });
}
