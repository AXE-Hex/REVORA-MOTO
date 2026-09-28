import { z } from 'zod';
export type PaymentRequest = {
  id: string;
  amountEgp: number;
  method: 'card' | 'instapay';
  returnUrl: string;
};
export type PaymentSession = {
  reference: string;
  checkoutUrl: string | null;
  status: 'pending';
};
export type RefundRequest = {
  id: string;
  paymentReference: string;
  amountEgp: number;
};
export type RefundSession = { reference: string; status: 'pending' };
export interface PaymentProvider {
  initiate(request: PaymentRequest): Promise<PaymentSession>;
  refund(request: RefundRequest): Promise<RefundSession>;
}
export class SandboxProvider implements PaymentProvider {
  async initiate(request: PaymentRequest): Promise<PaymentSession> {
    return {
      reference: `sandbox-${request.id}`,
      checkoutUrl: null,
      status: 'pending',
    };
  }
  async refund(): Promise<RefundSession> {
    throw new Error('A live provider is required to execute refunds');
  }
}
export class GatewayProvider implements PaymentProvider {
  async initiate(request: PaymentRequest): Promise<PaymentSession> {
    const endpoint = process.env.PAYMENT_GATEWAY_URL;
    const secret = process.env.PAYMENT_GATEWAY_SECRET;
    if (!endpoint || !secret || !endpoint.startsWith('https://'))
      throw new Error('Gateway is not configured');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${secret}`,
        'idempotency-key': request.id,
      },
      body: JSON.stringify({
        merchant_reference: request.id,
        amount_egp: request.amountEgp,
        currency: 'EGP',
        method: request.method,
        return_url: request.returnUrl,
      }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Gateway initiation failed');
    const parsed = z
      .object({ reference: z.string().min(1), checkout_url: z.string().url() })
      .parse(await response.json());
    if (!parsed.checkout_url.startsWith('https://'))
      throw new Error('Invalid gateway checkout URL');
    return {
      reference: parsed.reference,
      checkoutUrl: parsed.checkout_url,
      status: 'pending',
    };
  }
  async refund(request: RefundRequest): Promise<RefundSession> {
    const endpoint = process.env.PAYMENT_GATEWAY_REFUND_URL;
    const secret = process.env.PAYMENT_GATEWAY_SECRET;
    if (!endpoint || !secret || !endpoint.startsWith('https://'))
      throw new Error('Refund gateway is not configured');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${secret}`,
        'idempotency-key': request.id,
      },
      body: JSON.stringify({
        merchant_refund: request.id,
        payment_reference: request.paymentReference,
        amount_egp: request.amountEgp,
        currency: 'EGP',
      }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Refund initiation failed');
    const parsed = z
      .object({ reference: z.string().min(1).max(255) })
      .parse(await response.json());
    return { reference: parsed.reference, status: 'pending' };
  }
}
export function paymentProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === 'gateway'
    ? new GatewayProvider()
    : new SandboxProvider();
}
