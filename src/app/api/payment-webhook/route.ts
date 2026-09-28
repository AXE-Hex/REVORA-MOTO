import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
const event = z.object({
  event_id: z.string().min(5),
  payment_id: z.string().uuid(),
  provider_reference: z.string().min(1),
  amount_egp: z.number().positive(),
  currency: z.literal('EGP'),
  status: z.enum(['authorized', 'captured', 'failed', 'cancelled']),
});
export async function POST(request: NextRequest) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET,
    url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !key)
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const body = await request.text();
  if (body.length > 16384)
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const signature = request.headers.get('x-revora-signature') || '';
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const given = /^[0-9a-f]{64}$/i.test(signature)
    ? Buffer.from(signature, 'hex')
    : Buffer.alloc(0);
  if (
    given.length !== 32 ||
    !timingSafeEqual(Buffer.from(expected, 'hex'), given)
  )
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = event.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.rpc('record_payment_event', {
    p_payment: parsed.data.payment_id,
    p_event_id: parsed.data.event_id,
    p_reference: parsed.data.provider_reference,
    p_amount: parsed.data.amount_egp,
    p_status: parsed.data.status,
    p_currency: parsed.data.currency,
  });
  if (error)
    return NextResponse.json({ error: 'Event rejected' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
