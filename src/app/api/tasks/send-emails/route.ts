import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { configuredEmailProvider } from '@/lib/email-delivery';

export const runtime = 'nodejs';

const claimedEmail = z.object({
  outbox_id: z.string().uuid(),
  claim_token: z.string().uuid(),
  recipient_email: z.string().email(),
  title_ar: z.string(),
  title_en: z.string(),
  body_ar: z.string(),
  body_en: z.string(),
});

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
  const provider = configuredEmailProvider();
  if (!provider)
    return NextResponse.json(
      { error: 'Email provider not configured' },
      { status: 503 },
    );
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc('claim_notification_emails', {
    p_limit: 20,
  });
  if (error)
    return NextResponse.json({ error: 'Email claim failed' }, { status: 500 });

  let sent = 0;
  let failed = 0;
  let acknowledgementErrors = 0;
  for (const raw of data || []) {
    const parsed = claimedEmail.safeParse(raw);
    if (!parsed.success) {
      acknowledgementErrors++;
      continue;
    }
    const entry = parsed.data;
    let providerMessageId: string | null = null;
    let deliveryError: string | null = null;
    try {
      providerMessageId = await provider.send({
        id: entry.outbox_id,
        recipient: entry.recipient_email,
        titleAr: entry.title_ar,
        titleEn: entry.title_en,
        bodyAr: entry.body_ar,
        bodyEn: entry.body_en,
      });
    } catch {
      deliveryError = 'Email delivery failed';
    }
    const acknowledged = await admin.rpc('finish_notification_email', {
      p_outbox: entry.outbox_id,
      p_token: entry.claim_token,
      p_success: providerMessageId !== null,
      p_provider_message_id: providerMessageId,
      p_error: deliveryError,
    });
    if (acknowledged.error) acknowledgementErrors++;
    else if (providerMessageId) sent++;
    else failed++;
  }
  return NextResponse.json(
    { claimed: (data || []).length, sent, failed, acknowledgementErrors },
    { status: acknowledgementErrors ? 500 : 200 },
  );
}
