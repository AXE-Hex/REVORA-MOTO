import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';
import { paymentProvider } from '@/lib/payments';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: 'Invalid refund ID' }, { status: 400 });
  if (process.env.PAYMENT_PROVIDER !== 'gateway')
    return NextResponse.json(
      { error: 'Payment provider required' },
      { status: 503 },
    );
  const db = await supabase();
  if (!db)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const { data: user } = await db.auth.getUser();
  if (!user.user)
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  const [
    { data: canReadPayments },
    { data: canWriteOrders },
    { data: canWriteReservations },
  ] = await Promise.all([
    db.rpc('has_permission', { p_permission: 'payments.read' }),
    db.rpc('has_permission', { p_permission: 'orders.write' }),
    db.rpc('has_permission', { p_permission: 'reservations.write' }),
  ]);
  if (!canReadPayments || (!canWriteOrders && !canWriteReservations))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return NextResponse.json(
      { error: 'Server payment configuration missing' },
      { status: 503 },
    );
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: refund } = await admin
    .from('refund_requests')
    .select(
      'id,return_id,reservation_id,payment_id,amount_egp,currency_code,status,provider_reference',
    )
    .eq('id', id)
    .maybeSingle();
  if (
    !refund ||
    refund.status !== 'provider_required' ||
    refund.currency_code !== 'EGP'
  )
    return NextResponse.json({ error: 'Refund unavailable' }, { status: 404 });
  if (
    (refund.return_id && !canWriteOrders) ||
    (refund.reservation_id && !canWriteReservations)
  )
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data: payment } = await admin
    .from('payments')
    .select('id,status,provider_reference,amount_egp,currency_code')
    .eq('id', refund.payment_id)
    .single();
  if (
    !payment ||
    !['captured', 'partially_refunded'].includes(payment.status) ||
    !payment.provider_reference ||
    payment.currency_code !== 'EGP' ||
    Number(refund.amount_egp) > Number(payment.amount_egp)
  )
    return NextResponse.json(
      { error: 'Captured payment required' },
      { status: 409 },
    );
  const { data: claimed, error: claimError } = await admin
    .from('refund_requests')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'provider_required')
    .select('id')
    .maybeSingle();
  if (claimError || !claimed)
    return NextResponse.json(
      { error: 'Refund already started' },
      { status: 409 },
    );
  let session;
  try {
    session = await paymentProvider().refund({
      id,
      paymentReference: payment.provider_reference,
      amountEgp: Number(refund.amount_egp),
    });
  } catch {
    await admin
      .from('refund_requests')
      .update({
        status: 'provider_required',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .is('provider_reference', null);
    return NextResponse.json(
      { error: 'Refund initiation failed' },
      { status: 502 },
    );
  }
  const { error } = await admin
    .from('refund_requests')
    .update({
      provider_reference: session.reference,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending');
  if (error)
    return NextResponse.json(
      { error: 'Refund reference could not be recorded' },
      { status: 500 },
    );
  return NextResponse.json(session);
}
