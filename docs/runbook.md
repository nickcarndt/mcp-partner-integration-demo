# Runbook

Operational procedures for the MCP HTTP Server.

## Deployment

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
./setup.sh
```

### Start Server
```bash
npm run dev    # Development mode with watch
npm start      # Production mode
```

## Health Checks

### Endpoint
`GET /healthz`

### Expected Response
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "demoMode": true
}
```

### Monitoring
- Status code: 200
- Response time: < 100ms
- Status field: "ok"

## Tools

### List Available Tools
```bash
curl -s http://localhost:8080/tools | jq
```

### Execute Tool
```bash
curl -s -X POST http://localhost:8080/tools/ping \
  -H 'Content-Type: application/json' \
  -d '{"params":{"name":"Nick"}}' | jq
```

## Error Handling

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Endpoint not found
- `INTERNAL_ERROR`: Server error

### Debugging
- Check correlation ID in error response
- Check server logs for correlation ID
- Verify input format matches schema

## Configuration

### Environment Variables
- `PORT`: Server port (default: 8080)
- `DEMO_MODE`: Enable demo mode (default: false)

### Updating Config
1. Update `.env` file
2. Restart server

## Logging

### Log Format
```
[correlationId] Log message
```

### Correlation IDs
- Auto-generated if not provided
- Included in all error responses
- Use for tracing requests across services

## Maintenance

### Updating Dependencies
```bash
npm update
npm run build
npm test
```

### Code Quality Checks
```bash
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm run fmt        # Prettier
npm test           # Tests
```

## Rollback

If issues occur:
1. Check git history for last working commit
2. Revert to previous version
3. Restart server
4. Verify health check

## Troubleshooting

### Server Not Responding
1. Check if process is running
2. Check port availability
3. Check logs for errors
4. Verify environment variables

### Tool Execution Failing
1. Check request format
2. Verify Zod schema matches input
3. Check correlation ID in logs
4. Review error response

### Performance Issues
1. Check response times
2. Review logs for slow operations
3. Check for memory leaks
4. Verify demo mode is appropriate

