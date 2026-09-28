import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const refundEvent = z.object({
  event_id: z.string().min(5).max(255),
  refund_id: z.string().uuid(),
  provider_reference: z.string().min(1).max(255),
  amount_egp: z.number().positive(),
  currency: z.literal('EGP'),
  status: z.enum(['pending', 'succeeded', 'failed']),
});

export async function POST(request: NextRequest) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !key)
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const body = await request.text();
  if (body.length > 16384)
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const signature = request.headers.get('x-revora-signature') || '';
  const expected = createHmac('sha256', secret).update(body).digest();
  const provided = /^[0-9a-f]{64}$/i.test(signature)
    ? Buffer.from(signature, 'hex')
    : Buffer.alloc(0);
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(expected, provided)
  )
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = refundEvent.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.rpc('record_refund_event', {
    p_refund: parsed.data.refund_id,
    p_event_id: parsed.data.event_id,
    p_reference: parsed.data.provider_reference,
    p_amount: parsed.data.amount_egp,
    p_currency: parsed.data.currency,
    p_status: parsed.data.status,
  });
  if (error)
    return NextResponse.json({ error: 'Event rejected' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
