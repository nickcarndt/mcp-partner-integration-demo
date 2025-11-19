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

  // Real Shopify Admin API implementation
  // Support both SHOPIFY_STORE_URL and SHOPIFY_SHOP for flexibility
  const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL || process.env.SHOPIFY_SHOP;
  const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopifyStoreUrl || !shopifyAccessToken) {
    throw new Error(
      'Shopify credentials not configured. Set SHOPIFY_STORE_URL (or SHOPIFY_SHOP) and SHOPIFY_ACCESS_TOKEN environment variables, or use DEMO_MODE=true for mocks.'
    );
  }

  // Build the API URL
  // Handle both full URLs (mcp-commerce-demo.myshopify.com) and subdomains (mcp-commerce-demo)
  const shopDomain = shopifyStoreUrl.includes('.myshopify.com')
    ? shopifyStoreUrl
    : `${shopifyStoreUrl}.myshopify.com`;
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-10';
  const url = new URL(`https://${shopDomain}/admin/api/${apiVersion}/products.json`);

  // Add query parameters
  // Note: Shopify Admin REST API doesn't support text search directly
  // We fetch more products and filter client-side if a query is provided
  const fetchLimit = params.query ? Math.min((params.limit || 10) * 5, 250) : params.limit || 10;
  url.searchParams.set('limit', String(fetchLimit));

  // Make the API request
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': shopifyAccessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Shopify API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = (await response.json()) as { products?: any[] };
  let products = data.products || [];

  // Filter products by query if provided (case-insensitive search in title, vendor, product_type)
  if (params.query) {
    const queryLower = params.query.toLowerCase();
    products = products.filter((product: any) => {
      const title = (product.title || '').toLowerCase();
      const vendor = (product.vendor || '').toLowerCase();
      const productType = (product.product_type || '').toLowerCase();
      return (
        title.includes(queryLower) ||
        vendor.includes(queryLower) ||
        productType.includes(queryLower)
      );
    });
    // Limit results after filtering
    products = products.slice(0, params.limit || 10);
  }

  // Transform Shopify products to match expected format
  const transformedProducts = products.map((product: any) => {
    const variant = product.variants?.[0];
    return {
      id: String(product.id),
      title: product.title,
      price: variant?.price || '0.00',
      vendor: product.vendor || '',
      productType: product.product_type || '',
      createdAt: product.created_at,
      handle: product.handle,
      status: product.status,
      variants: product.variants?.map((v: any) => ({
        id: String(v.id),
        title: v.title,
        price: v.price,
        sku: v.sku,
        inventoryQuantity: v.inventory_quantity,
      })),
    };
  });

  return {
    ok: true,
    products: transformedProducts,
    total: transformedProducts.length,
    query: params.query,
  };
}

