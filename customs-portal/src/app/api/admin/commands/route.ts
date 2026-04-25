import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { execute } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await execute("SELECT * FROM custom_commands ORDER BY name ASC");
    return NextResponse.json(res.rows);
  } catch (e) {
    console.error('[COMMAND FETCH ERROR]', e);
    return NextResponse.json({ error: 'Failed to fetch commands' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, content, id } = await req.json();
    if (!name || !content) return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });

    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 32);

    if (id) {
       await execute("UPDATE custom_commands SET name = ?, content = ? WHERE id = ?", [cleanName, content, id]);
    } else {
       await execute("INSERT INTO custom_commands (name, content) VALUES (?, ?)", [cleanName, content]);
    }

    return NextResponse.json({ success: true, name: cleanName });
  } catch (e) {
    console.error('[COMMAND SAVE ERROR]', e);
    return NextResponse.json({ error: 'Name must be unique and valid' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing command ID' }, { status: 400 });

    await execute("DELETE FROM custom_commands WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[COMMAND DELETE ERROR]', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
