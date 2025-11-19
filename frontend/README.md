# MCP Checkout Frontend

Minimal Next.js app for Stripe checkout success and cancel pages.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your MCP server URL:
```
NEXT_PUBLIC_MCP_SERVER_URL=https://your-mcp-server.run.app
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Production Build

```bash
npm run build
npm start
```

## Deployment

This app is designed to be deployed to Vercel. The `NEXT_PUBLIC_SITE_URL` will be automatically set by Vercel.

