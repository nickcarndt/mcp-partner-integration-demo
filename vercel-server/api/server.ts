import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { DEMO_MODE } from '../lib/utils.js';
import { searchProducts } from '../lib/tools/shopify.js';
import {
  createCheckoutSession,
  createCheckoutSessionLegacy,
  getPaymentStatus,
} from '../lib/tools/stripe.js';

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'ping',
      'A simple ping tool',
      { name: z.string().optional() },
      async ({ name }) => ({
        content: [{ type: 'text', text: `Hello, ${name ?? 'World'}!` }],
      })
    );

    server.tool(
      'shopify_search_products',
      'Search for products in a Shopify store by query string',
      {
        query: z.string(),
        limit: z.number().int().positive().optional().default(10),
      },
      async (args) => {
        const result = await searchProducts(args, DEMO_MODE);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      'stripe_create_checkout_session',
      'Create a Stripe checkout session with a product name and price',
      {
        productName: z.string(),
        price: z.number().positive(),
        currency: z.string().optional().default('usd'),
        successUrl: z.string().url().optional(),
        cancelUrl: z.string().url().optional(),
      },
      async (args) => {
        const result = await createCheckoutSession(
          args.productName,
          args.price,
          args.currency || 'usd',
          DEMO_MODE,
          args.successUrl,
          args.cancelUrl
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      'stripe_create_checkout_session_legacy',
      'Create a Stripe checkout session using price IDs (legacy API)',
      {
        items: z.array(
          z.object({
            priceId: z.string(),
            quantity: z.number().int().positive(),
          })
        ),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      },
      async (args) => {
        const result = await createCheckoutSessionLegacy(args, DEMO_MODE);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      'stripe_get_payment_status',
      'Get the payment status for a Stripe payment intent',
      {
        paymentIntentId: z.string(),
      },
      async (args) => {
        const result = await getPaymentStatus(args.paymentIntentId, DEMO_MODE);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );
  },
  {},
  {
    redisUrl: process.env.REDIS_URL,
    verboseLogs: process.env.NODE_ENV !== 'production',
  }
);

export { handler as GET, handler as POST, handler as DELETE };

