import { z } from 'zod';

export type NotificationEmail = {
  id: string;
  recipient: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

export interface EmailDeliveryProvider {
  send(message: NotificationEmail): Promise<string>;
}

const configSchema = z.object({
  endpoint: z
    .string()
    .url()
    .refine((value) => value.startsWith('https://')),
  token: z.string().min(1),
  sender: z.string().email(),
});

export class HttpEmailDeliveryProvider implements EmailDeliveryProvider {
  constructor(private readonly config: z.infer<typeof configSchema>) {
    configSchema.parse(config);
  }

  async send(message: NotificationEmail): Promise<string> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + this.config.token,
        'idempotency-key': message.id,
      },
      body: JSON.stringify({
        from: this.config.sender,
        to: message.recipient,
        subject: message.titleEn + ' / ' + message.titleAr,
        text:
          message.titleAr +
          '\n' +
          message.bodyAr +
          '\n\n' +
          message.titleEn +
          '\n' +
          message.bodyEn,
        idempotency_key: message.id,
      }),
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Email provider rejected delivery');
    const result = z
      .object({ id: z.string().min(1).max(200) })
      .safeParse(await response.json());
    if (!result.success) throw new Error('Invalid email provider response');
    return result.data.id;
  }
}

export function configuredEmailProvider(): EmailDeliveryProvider | null {
  if (process.env.EMAIL_PROVIDER !== 'http') return null;
  const config = configSchema.safeParse({
    endpoint: process.env.EMAIL_PROVIDER_URL,
    token: process.env.EMAIL_PROVIDER_SECRET,
    sender: process.env.EMAIL_FROM_ADDRESS,
  });
  return config.success ? new HttpEmailDeliveryProvider(config.data) : null;
}
