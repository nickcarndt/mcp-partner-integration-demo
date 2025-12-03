import { z } from 'zod';
import Stripe from 'stripe';

// Initialize Stripe client (will be null if credentials missing, checked at runtime)
let stripe: Stripe | null = null;

const initializeStripe = (): Stripe => {
  if (stripe) {
    return stripe;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error(
      'Stripe credentials not configured. Set STRIPE_SECRET_KEY environment variable, or use DEMO_MODE=true for mocks.'
    );
  }

  stripe = new Stripe(stripeSecretKey);

  return stripe;
};

// Schema for createCheckoutSession params (for backward compatibility with existing server routes)
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

// Schema for simple product checkout (new API)
export const SimpleCheckoutSessionParamsSchema = z.object({
  productName: z.string(),
  price: z.number().int().positive(),
  currency: z.string().optional().default('usd'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// Schema for getPaymentStatus params
export const GetPaymentStatusParamsSchema = z.object({
  paymentIntentId: z.string(),
});

export type CreateCheckoutSessionParams = z.infer<typeof CreateCheckoutSessionParamsSchema>;
export type SimpleCheckoutSessionParams = z.infer<typeof SimpleCheckoutSessionParamsSchema>;
export type GetPaymentStatusParams = z.infer<typeof GetPaymentStatusParamsSchema>;

/**
 * Create a Stripe Checkout Session (simple version with productName and price)
 */
export async function createCheckoutSession(
  productName: string,
  price: number,
  currency: string = 'usd',
  demoMode: boolean = false,
  successUrl?: string,
  cancelUrl?: string
): Promise<{
  checkout_url: string;
  session_id: string;
  payment_intent: string | null;
}> {
  // Validate price
  if (price <= 0) {
    throw new Error('Price must be greater than 0');
  }

  // Validate minimum amount (Stripe requires at least $0.50 USD or equivalent)
  const minimumAmount = currency === 'usd' ? 0.5 : 0.01; // Adjust for other currencies if needed
  if (price < minimumAmount) {
    throw new Error(`Price must be at least ${minimumAmount} ${currency.toUpperCase()}`);
  }

  if (demoMode) {
    return {
      checkout_url: 'https://example.com/demo-checkout',
      session_id: 'demo_session_123',
      payment_intent: 'demo_pi_123',
    };
  }

  try {
    const stripeClient = initializeStripe();

    // Use provided URLs, or NEXT_PUBLIC_SITE_URL from env, or fallback to localhost
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const defaultSuccessUrl = successUrl || `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = cancelUrl || `${siteUrl}/cancel`;

    // Convert price from dollars to cents (smallest currency unit)
    // Stripe requires amounts in the smallest currency unit (cents for USD)
    const unitAmountInCents = Math.round(price * 100);

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: productName,
            },
            unit_amount: unitAmountInCents, // Convert dollars to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: defaultSuccessUrl,
      cancel_url: defaultCancelUrl,
    });

    return {
      checkout_url: session.url || '',
      session_id: session.id,
      payment_intent: session.payment_intent as string | null,
    };
  } catch (error: any) {
    console.error('Stripe checkout session creation error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    });
    throw new Error(`Stripe API error: ${error.message || 'Failed to create checkout session'}`);
  }
}

/**
 * Get payment status for a payment intent
 */
export async function getPaymentStatus(
  paymentIntentId: string,
  demoMode: boolean = false
): Promise<{
  status: string;
  amount: number;
  currency: string;
}> {
  if (demoMode) {
    return {
      status: 'succeeded',
      amount: 2999,
      currency: 'usd',
    };
  }

  try {
    const stripeClient = initializeStripe();

    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

    return {
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error: any) {
    console.error('Stripe payment intent retrieval error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      paymentIntentId,
    });
    throw new Error(`Stripe API error: ${error.message || 'Failed to retrieve payment intent'}`);
  }
}

/**
 * Legacy function for backward compatibility with existing server routes
 * Uses the params object pattern
 */
export async function createCheckoutSessionLegacy(
  params: CreateCheckoutSessionParams,
  demoMode: boolean,
  idempotencyKey?: string
): Promise<any> {
  if (demoMode) {
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

  try {
    const stripeClient = initializeStripe();

    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: params.items.map((item) => ({
        price: item.priceId,
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    };

    if (idempotencyKey) {
      sessionOptions.client_reference_id = idempotencyKey;
    }

    const session = await stripeClient.checkout.sessions.create(sessionOptions, {
      idempotencyKey: idempotencyKey,
    });

    return {
      ok: true,
      sessionId: session.id,
      url: session.url || '',
      items: params.items,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      createdAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey || undefined,
    };
  } catch (error: any) {
    console.error('Stripe checkout session creation error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    });
    throw new Error(`Stripe API error: ${error.message || 'Failed to create checkout session'}`);
  }
}

