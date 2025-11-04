# Implementation Guide

This guide covers the architecture, patterns, and conventions used in the MCP HTTP Server.

## Architecture

### Server Structure

The server is a simple HTTP server built with Node.js that exposes MCP tools via REST endpoints.

- **Port:** 8080 (configurable via `PORT` env var)
- **Health Check:** `GET /healthz`
- **List Tools:** `GET /tools`
- **Execute Tool:** `POST /tools/{toolName}`

### Request/Response Format

**Tool Execution Request:**
```json
{
  "params": {
    "key": "value"
  }
}
```

**Tool Execution Response:**
```json
{
  "result": {
    "message": "Hello, World!",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "correlationId": "req-1234567890-abc123"
  }
}
```

## Patterns

### Correlation IDs

Every request gets a correlation ID for tracing:
- Header: `X-Correlation-ID` (optional, auto-generated if missing)
- Included in all error responses
- Logged with all errors

### Error Envelopes

All errors follow a structured format:
```typescript
{
  error: {
    code: string;      // Error code (VALIDATION_ERROR, NOT_FOUND, etc.)
    message: string;   // Human-readable message
    correlationId: string; // Request correlation ID
  }
}
```

### Input Validation

All inputs are validated using Zod schemas:
```typescript
const PingParamsSchema = z.object({
  name: z.string().optional(),
});
```

### Demo Mode

Use `DEMO_MODE=true` for mocked behavior. Preserve the contract when switching to real APIs.

## Adding New Tools

1. Define Zod schema for tool parameters
2. Add tool handler to `tools` object
3. Add route handler in server
4. Update documentation

Example:
```typescript
const MyToolParamsSchema = z.object({
  input: z.string(),
});

const tools = {
  // ... existing tools
  myTool: {
    name: 'myTool',
    description: 'My new tool',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
      },
    },
    handler: async (params: z.infer<typeof MyToolParamsSchema>) => {
      // Implementation
      return { result: 'success' };
    },
  },
};
```

## Testing

Run tests with:
```bash
npm test
```

Tests should:
- Cover all tool handlers
- Test error cases
- Validate input schemas
- Check correlation ID propagation

## Logging

Use correlation IDs in all log messages:
```typescript
console.error(`[${correlationId}] Error:`, err);
```

## Environment Variables

- `PORT`: Server port (default: 8080)
- `DEMO_MODE`: Enable demo/mock mode (default: false)

