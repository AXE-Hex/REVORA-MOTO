import { afterEach, describe, expect, it, vi } from 'vitest';
import { GatewayProvider, SandboxProvider } from './payments';

const originalUrl = process.env.PAYMENT_GATEWAY_URL;
const originalSecret = process.env.PAYMENT_GATEWAY_SECRET;
const originalRefundUrl = process.env.PAYMENT_GATEWAY_REFUND_URL;
afterEach(() => {
  process.env.PAYMENT_GATEWAY_URL = originalUrl;
  process.env.PAYMENT_GATEWAY_SECRET = originalSecret;
  process.env.PAYMENT_GATEWAY_REFUND_URL = originalRefundUrl;
  vi.unstubAllGlobals();
});

describe('payment initiation', () => {
  const request = {
    id: '11111111-1111-4111-8111-111111111111',
    amountEgp: 100,
    method: 'card' as const,
    returnUrl: 'https://example.com/orders/1',
  };
  it('keeps sandbox payments pending without a checkout URL', async () => {
    expect(await new SandboxProvider().initiate(request)).toEqual({
      reference: `sandbox-${request.id}`,
      checkoutUrl: null,
      status: 'pending',
    });
  });
  it('rejects a gateway without HTTPS configuration', async () => {
    process.env.PAYMENT_GATEWAY_URL = 'http://insecure.example';
    process.env.PAYMENT_GATEWAY_SECRET = 'secret';
    await expect(new GatewayProvider().initiate(request)).rejects.toThrow(
      'Gateway is not configured',
    );
  });
  it('keeps sandbox refunds unavailable until a real provider exists', async () => {
    await expect(new SandboxProvider().refund()).rejects.toThrow(
      'live provider',
    );
  });
  it('sends refunds in EGP with a stable idempotency key', async () => {
    process.env.PAYMENT_GATEWAY_REFUND_URL = 'https://gateway.example/refunds';
    process.env.PAYMENT_GATEWAY_SECRET = 'server-only-secret';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reference: 'provider-refund-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const refund = {
      id: '22222222-2222-4222-8222-222222222222',
      paymentReference: 'provider-payment-1',
      amountEgp: 125.5,
    };
    expect(await new GatewayProvider().refund(refund)).toEqual({
      reference: 'provider-refund-1',
      status: 'pending',
    });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://gateway.example/refunds');
    expect(options.headers).toMatchObject({ 'idempotency-key': refund.id });
    expect(JSON.parse(String(options.body))).toMatchObject({
      merchant_refund: refund.id,
      payment_reference: refund.paymentReference,
      amount_egp: 125.5,
      currency: 'EGP',
    });
  });
});
