import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpEmailDeliveryProvider } from './email-delivery';

afterEach(() => vi.unstubAllGlobals());

const message = {
  id: '7b7b7b7b-7b7b-47b7-87b7-7b7b7b7b7b7b',
  recipient: 'customer@example.test',
  titleAr: 'تحديث الطلب',
  titleEn: 'Order update',
  bodyAr: 'تم الشحن',
  bodyEn: 'Shipped',
};

describe('HTTP email delivery adapter', () => {
  it('sends bilingual content with a stable idempotency key', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'provider-123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    const provider = new HttpEmailDeliveryProvider({
      endpoint: 'https://mail.example.test/send',
      token: 'secret',
      sender: 'sales@example.test',
    });
    expect(await provider.send(message)).toBe('provider-123');
    expect(fetcher).toHaveBeenCalledWith(
      'https://mail.example.test/send',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        headers: expect.objectContaining({
          'idempotency-key': message.id,
        }),
      }),
    );
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body).toMatchObject({
      to: message.recipient,
      idempotency_key: message.id,
    });
    expect(body.text).toContain(message.bodyAr);
    expect(body.text).toContain(message.bodyEn);
  });

  it('rejects a provider response without a message ID', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    );
    const provider = new HttpEmailDeliveryProvider({
      endpoint: 'https://mail.example.test/send',
      token: 'secret',
      sender: 'sales@example.test',
    });
    await expect(provider.send(message)).rejects.toThrow(
      'Invalid email provider response',
    );
  });

  it('requires HTTPS for the delivery endpoint', () => {
    expect(
      () =>
        new HttpEmailDeliveryProvider({
          endpoint: 'http://mail.example.test/send',
          token: 'secret',
          sender: 'sales@example.test',
        }),
    ).toThrow();
  });
});
