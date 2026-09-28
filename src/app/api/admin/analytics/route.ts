import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser, supabase } from '@/lib/supabase/server';

const rangeSchema = z.enum(['7d', '30d', '90d', '12m']);

export async function GET(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const db = await supabase();
  if (!db) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const { data: allowed, error: permissionError } = await db.rpc(
    'has_permission',
    { p_permission: 'reports.read' },
  );
  if (permissionError || !allowed) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const range = rangeSchema.safeParse(
    new URL(request.url).searchParams.get('range'),
  );
  if (!range.success) {
    return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
  }
  const { data, error } = await db.rpc('admin_analytics_timeseries', {
    p_range: range.data,
  });
  if (error || !data) {
    return NextResponse.json(
      { error: 'analytics_unavailable' },
      { status: 503 },
    );
  }
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
