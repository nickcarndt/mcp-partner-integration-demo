// Vitest setup for HTTPS tests with self-signed certificates
// This file is automatically loaded by vitest.config.ts

// Configure Undici Agent (Node.js built-in) to skip SSL certificate verification
// This allows tests to work with self-signed certificates
// Note: NODE_TLS_REJECT_UNAUTHORIZED=0 is also set in package.json test script

(async () => {
  try {
    // Try node:undici (Node.js 18.13+)
    const undici = await import('node:undici');
    const agent = new undici.Agent({
      connect: {
        rejectUnauthorized: false,
      },
    });
    undici.setGlobalDispatcher(agent);
  } catch {
    try {
      // Fallback: try undici package (if installed)
      const undici = await import('undici');
      const agent = new undici.Agent({
        connect: {
          rejectUnauthorized: false,
        },
      });
      undici.setGlobalDispatcher(agent);
    } catch {
      // If undici is not available, rely on NODE_TLS_REJECT_UNAUTHORIZED=0
      // This is handled by the test script in package.json
    }
  }
})();

