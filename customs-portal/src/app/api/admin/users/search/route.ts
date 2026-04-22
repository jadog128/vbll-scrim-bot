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
       return NextResponse.json({ users: [] }); 
    }

    const searchString = `%${query}%`;
    const result = await execute(
      `
      SELECT 
        discord_id, 
        MAX(username) as username, 
        SUM(count) as total_requests,
        MAX(last_active) as last_request_date
      FROM (
        SELECT discord_id, username, COUNT(*) as count, created_at as last_active FROM batch_requests WHERE discord_id LIKE ? OR username LIKE ? GROUP BY discord_id
        UNION ALL
        SELECT discord_id, username, COUNT(*) as count, created_at as last_active FROM scrim_requests WHERE discord_id LIKE ? OR username LIKE ? GROUP BY discord_id
      )
      GROUP BY discord_id
      ORDER BY last_request_date DESC
      LIMIT 30
      `,
      [searchString, searchString, searchString, searchString]
    );

    return NextResponse.json({ users: result.rows });
  } catch (error: any) {
    console.error("Search Users Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

