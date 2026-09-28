import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = process.env.REVORA_TASK_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !key)
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const supplied =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const left = Buffer.from(secret);
  const right = Buffer.from(supplied);
  if (left.length !== right.length || !timingSafeEqual(left, right))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [reservations, orders, searchTerms] = await Promise.all([
    admin.rpc('expire_unpaid_reservations', { p_limit: 100 }),
    admin.rpc('expire_unpaid_orders', { p_limit: 100 }),
    admin.rpc('purge_search_term_daily'),
  ]);
  if (reservations.error || orders.error || searchTerms.error)
    return NextResponse.json({ error: 'Expiration failed' }, { status: 500 });
  return NextResponse.json({
    expired_reservations: reservations.data,
    expired_orders: orders.data,
    purged_search_activity: searchTerms.data,
  });
}
