import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/server';
import { paymentProvider } from '@/lib/payments';
import { z } from 'zod';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
  const locale =
    request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'ar';
  const db = await supabase();
  if (!db)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  const { data: payment } = await db
    .from('payments')
    .select(
      'id,amount_egp,method,status,provider,provider_reference,checkout_url,order_id,reservation_id',
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!payment || payment.status !== 'pending')
    return NextResponse.json({ error: 'Payment unavailable' }, { status: 404 });
  if (payment.provider_reference)
    return NextResponse.json({
      reference: payment.provider_reference,
      checkoutUrl: payment.checkout_url,
      status: 'pending',
    });
  if (
    payment.method === 'instapay' &&
    process.env.PAYMENT_PROVIDER !== 'gateway'
  )
    return NextResponse.json({
      reference: payment.provider_reference,
      status: 'pending',
      message: 'Awaiting an official InstaPay provider integration',
    });
  const isGateway = process.env.PAYMENT_PROVIDER === 'gateway';
  let admin: SupabaseClient | null = null;
  if (isGateway) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      return NextResponse.json(
        { error: 'Server payment configuration missing' },
        { status: 503 },
      );
    admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claim } = await admin
      .from('payments')
      .update({ provider: 'initiating' })
      .eq('id', id)
      .eq('status', 'pending')
      .eq('provider', 'pending')
      .is('provider_reference', null)
      .select('id')
      .maybeSingle();
    if (!claim)
      return NextResponse.json(
        { error: 'Payment initiation already started' },
        { status: 409 },
      );
  }
  let session;
  try {
    session = await paymentProvider().initiate({
      id,
      amountEgp: Number(payment.amount_egp),
      method: payment.method,
      returnUrl: `${new URL(request.url).origin}/${locale}/${payment.order_id ? `orders/${payment.order_id}` : `reservations/${payment.reservation_id}`}`,
    });
  } catch {
    if (admin)
      await admin
        .from('payments')
        .update({ provider: 'pending' })
        .eq('id', id)
        .eq('status', 'pending')
        .eq('provider', 'initiating')
        .is('provider_reference', null);
    return NextResponse.json(
      { error: 'Payment initiation failed' },
      { status: 502 },
    );
  }
  if (admin) {
    const { error } = await admin
      .from('payments')
      .update({
        provider: 'gateway',
        provider_reference: session.reference,
        checkout_url: session.checkoutUrl,
      })
      .eq('id', id)
      .eq('status', 'pending')
      .eq('provider', 'initiating');
    if (error)
      return NextResponse.json(
        { error: 'Payment reference could not be recorded' },
        { status: 500 },
      );
  }
  return NextResponse.json(session);
}
