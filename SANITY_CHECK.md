# Sanity Check Checklist

## ✅ Pre-flight Checks

- [x] Node.js version: `node -v` should be ≥ 20.x (Current: v24.7.0 ✅)
- [x] Setup script is executable: `chmod +x setup.sh`
- [x] `.env.example` includes `DEMO_MODE=true`

## 🚀 Setup & Run

```bash
# 1. Install dependencies and build
./setup.sh

# 2. Start server (in background or new terminal)
npm run dev

# 3. In another terminal, run smoke tests
curl -s http://localhost:8080/healthz | jq
curl -s -X POST http://localhost:8080/tools/ping \
  -H 'Content-Type: application/json' \
  -d '{"params":{"name":"Nick"}}' | jq
```

## ✅ Expected Results

### Health Check Response
```json
{
  "ok": true,
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "demoMode": true
}
```

### Ping Tool Response
```json
{
  "ok": true,
  "message": "Hello, Nick!",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🎨 Demo UI

Open `http://localhost:8080` in your browser to see the interactive demo UI.

The demo UI includes:
- Health check button
- Ping tool tester
- Shopify product search tester
- Stripe checkout session creator

## 🧪 Test Suite

Run tests with:
```bash
npm test
```

Tests verify:
- Health endpoint returns `ok: true`
- Ping tool works with name parameter
- Shopify search products (mock)
- Stripe checkout session (mock)

## 📋 Cursor Configuration Checklist

After setup, configure Cursor:

1. **Agent Profiles** (Multi-Agents sidebar):
   - 🧭 Architect (Composer)
   - 🛠 Implementer (Composer)
   - 🔍 Reviewer (GPT-5 Codex)
   - ✅ QA (Composer)

2. **Team Rules**: Paste from `docs/team-rules.md`

3. **Team Commands**: Import from `docs/team-commands.json`

4. **Sandboxed Terminals**: Allowlist npm scripts
   - `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `fmt`, `smoke`

5. **Settings**:
   - Default model: Composer
   - Reviewer model: GPT-5 Codex
   - Multi-Agents: 2-4 parallel
   - Browser (GA): ON
   - Plan Mode: Enabled

## 🐛 Common Issues

### 404 on `/`
- Check that `src/public/demo.html` exists
- Verify Express static middleware is configured

### ENOENT demo.html
- Ensure file is at `src/public/demo.html`
- Check file permissions

### CORS errors
- Server already includes CORS headers
- Check `Access-Control-Allow-Origin` is set to `*`

### Sandboxed terminal can't run commands
- Add npm scripts to allowlist in Cursor admin
- Use `npm run <script>` instead of raw commands

### Tests fail
- Ensure server is running on port 8080
- Check `DEMO_MODE=true` in `.env`
- Verify all dependencies installed: `npm install`

