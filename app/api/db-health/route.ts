import { NextResponse } from 'next/server';
import { ensureDbConnected } from '@/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await ensureDbConnected();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'connection failed' },
      { status: 500 }
    );
  }
}


