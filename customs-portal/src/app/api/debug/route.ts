import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const envCheck = {
    VBLL_DISCORD_CLIENT_ID: !!process.env.VBLL_DISCORD_CLIENT_ID,
    DISCORD_CLIENT_ID: !!process.env.DISCORD_CLIENT_ID,
    VBLL_DISCORD_CLIENT_SECRET: !!process.env.VBLL_DISCORD_CLIENT_SECRET,
    DISCORD_CLIENT_SECRET: !!process.env.DISCORD_CLIENT_SECRET,
    VBLL_NEXTAUTH_URL: !!process.env.VBLL_NEXTAUTH_URL,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    VBLL_NEXTAUTH_SECRET: !!process.env.VBLL_NEXTAUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: !!process.env.VERCEL,
  };

  return NextResponse.json(envCheck);
}
