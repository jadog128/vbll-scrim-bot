import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    
    if (!query || query.length < 3) {
       return NextResponse.json({ users: [] }); // Require 3 chars
    }

    // Since we don't have a concrete `users` table globally, we aggregate from `batch_requests`
    // Which holds `discord_id` and `username`.
    const searchString = `%${query}%`;
    const result = await execute(
      `
      SELECT 
        discord_id, 
        MAX(username) as username, 
        MAX(avatar) as avatar,
        COUNT(id) as total_requests,
        MAX(created_at) as last_request_date
      FROM batch_requests
      WHERE discord_id LIKE ? OR username LIKE ?
      GROUP BY discord_id
      LIMIT 20
      `,
      [searchString, searchString]
    );

    return NextResponse.json({ users: result.rows });
  } catch (error: any) {
    console.error("Search Users Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
