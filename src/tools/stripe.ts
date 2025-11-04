import { z } from 'zod';

export const CreateCheckoutSessionParamsSchema = z.object({
  items: z.array(
    z.object({
      priceId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateCheckoutSessionParams = z.infer<typeof CreateCheckoutSessionParamsSchema>;

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
  demoMode: boolean,
  idempotencyKey?: string
): Promise<any> {
  if (demoMode) {
    // Mock checkout session with idempotency support
    const sessionId = idempotencyKey
      ? `cs_mock_${idempotencyKey}`
      : `cs_mock_${Date.now()}`;
    return {
      ok: true,
      sessionId,
      url: `https://checkout.stripe.com/pay/${sessionId}`,
      items: params.items,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      createdAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey || undefined,
    };
  }

  // Real implementation would call Stripe API here with idempotencyKey
  throw new Error('Real Stripe API not implemented. Set DEMO_MODE=true for mocks.');
}

