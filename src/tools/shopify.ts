import { z } from 'zod';

export const SearchProductsParamsSchema = z.object({
  query: z.string(),
  limit: z.number().int().positive().optional().default(10),
});

export type SearchProductsParams = z.infer<typeof SearchProductsParamsSchema>;

export async function searchProducts(
  params: SearchProductsParams,
  demoMode: boolean
): Promise<any> {
  if (demoMode) {
    // Mock product search results
    return {
      ok: true,
      products: Array.from({ length: Math.min(params.limit || 10, 5) }, (_, i) => ({
        id: `prod_${i + 1}`,
        title: `Mock Product ${i + 1} - ${params.query}`,
        price: (19.99 + i * 10).toFixed(2),
        vendor: 'Demo Vendor',
        productType: 'Demo Type',
        createdAt: new Date().toISOString(),
      })),
      total: 5,
      query: params.query,
    };
  }

  // Real implementation would call Shopify API here
  throw new Error('Real Shopify API not implemented. Set DEMO_MODE=true for mocks.');
}

