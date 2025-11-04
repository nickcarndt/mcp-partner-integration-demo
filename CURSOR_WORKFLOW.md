# Cursor Pro Multi-Agent Workflow Guide

This document provides step-by-step instructions for building the MCP HTTP Server demo using Cursor Pro's multi-agent workflow.

## Prerequisites

1. Cursor Pro 2.0+ installed
2. Node.js 20+ installed
3. Git configured

## Step 1: Configure Team Rules

Navigate to **Cursor → Team → Rules** and paste:

```
rules:
  - "MCP server exposes tools only; no LLM SDKs."
  - "Architect must produce plan + impacted files + risks + backout before edits."
  - "Implementer edits only files listed by Architect."
  - "Reviewer (GPT-5 Codex) blocks merges >300 LOC unless plan is REFAC."
  - "QA runs tests before proposing code edits."
  - "Use DEMO_MODE=true for mocks; keep tool contracts stable when swapping to real APIs."
  - "Echo x-correlation-id in responses; prefer idempotency keys for checkout."
  - "Strict CORS via ALLOWED_ORIGINS; never commit secrets; use .env.example."
```

## Step 2: Configure Team Commands

Navigate to **Cursor → Team → Commands** and paste:

```json
[
  {
    "name": "plan:feature",
    "model": "Composer",
    "prompt": "You are Architect. Produce 6–10 steps, impacted files, risks, backout. No code."
  },
  {
    "name": "build:feature",
    "model": "Composer",
    "prompt": "You are Implementer. Follow plan strictly. Minimal typed diffs + tests."
  },
  {
    "name": "review:codex",
    "model": "GPT-5 Codex",
    "prompt": "You are Reviewer. Cross-file diffs; enforce contracts, errors, security, logging; propose exact diffs."
  },
  {
    "name": "qa:test",
    "model": "Composer",
    "prompt": "You are QA. Generate/execute tests; report failures with file:line and assertion."
  },
  {
    "name": "docify",
    "model": "Composer",
    "prompt": "You are Docifier. Update README and /docs (Implementation Guide, FAQ, Runbook)."
  }
]
```

## Step 3: Create Agent Profiles

Navigate to **Cursor → Multi-Agents** and create:

### 🧭 Architect (Planner)
- **Model:** Composer
- **Prompt:** "You are Architect. Produce 6–10 step plan, impacted files (paths), risks + mitigations, backout plan. No code. Keep diff size < 300 LOC per PR unless marked REFAC."

### 🛠 Implementer (Builder)
- **Model:** Composer
- **Prompt:** "You are Implementer. Follow the latest Architect plan exactly. Only edit listed files. Type-safe minimal diffs. Add/extend tests. Write commit messages per step. Stop if plan is missing/ambiguous."

### 🔍 Reviewer (Code Review)
- **Model:** GPT-5 Codex
- **Prompt:** "You are Reviewer. Summarize diffs across files, catch risks, and propose inline fixes. Checklist: typing, error envelopes, Zod io-validate, logging w/ correlation IDs, DEMO_MODE guards, no secrets, small diffs."

### ✅ QA (Tests)
- **Model:** Composer
- **Prompt:** "You are QA. Generate/execute tests. Report failing specs with file:line and assertion. Propose minimal fixes or hand back to Implementer."

## Step 4: Build the Project

### 4.1 Plan the Feature

**Command:** `plan:feature`

**Prompt:**
```
Goal: Scaffold a tools-only MCP HTTP server demo (Express + Zod + Pino) with:

- /healthz and /healthz/ready
- /mcp-manifest.json (no-store)
- /tools/ping, /tools/shopify.searchProducts, /tools/stripe.createCheckoutSession
- DEMO_MODE=true for mocks (no real API calls)
- Static demo UI at / with buttons to invoke tools and a panel to show headers + error envelopes
- Error taxonomy: BAD_PARAMS, UNKNOWN_TOOL, UPSTREAM_4XX, UPSTREAM_5XX, TIMEOUT, INTERNAL
- Correlation ID middleware (x-correlation-id) and optional x-idempotency-key on checkout
- Strict CORS (env ALLOWED_ORIGINS), helmet, 10s request timeout
- Tests (vitest): happy + negative paths

Files:
- package.json (npm scripts: dev, build, start, lint, typecheck, test, fmt, smoke)
- tsconfig.json, .eslintrc.json, .prettierrc, .gitignore
- src/server.ts, src/schema.ts, src/logger.ts, src/types.ts
- src/tools/shopify.ts, src/tools/stripe.ts
- src/public/demo.html
- vitest.config.ts, src/server.test.ts
- setup.sh (executable)
- .env.example (PORT, NODE_ENV, ALLOWED_ORIGINS, DEMO_MODE)
- README.md, QUICKSTART.md, docs/{agent-profiles.md, team-rules.md, team-commands.json, cursor-setup-guide.md, implementation-guide.md, faq.md, runbook.md, SUMMARY.md}

Constraints:
- No LLM SDKs in the server. Server exposes tools only and returns clean JSON.
- Keep diffs <300 LOC per PR unless marked REFAC.

Output: Step plan + file list + risks + backout plan. No code yet.
```

**Expected Output:** A detailed plan with 6-10 steps, list of impacted files, risks/mitigations, and backout plan.

### 4.2 Implement the Scaffold

**Command:** `build:feature`

**Prompt:**
```
Follow the latest plan. Create all files with production-lean defaults. Key details:

- Express + helmet + cors; 10s req timeout; echo x-correlation-id
- Pino + pino-http with correlationId in logs
- DEMO_MODE mocks in tools; Zod validate input and output
- /mcp-manifest.json with ping, shopify.searchProducts, stripe.createCheckoutSession; set Cache-Control: no-store
- demo.html: buttons for health, ping, shopify, stripe; inputs for params, x-correlation-id, x-idempotency-key; show response JSON + headers; copy-cURL button
- Tests for happy/negative paths
- setup.sh idempotent; Dockerfile (Cloud Run friendly)

Success criteria:
- `npm run dev` serves demo at http://localhost:8080
- curl health/ping work; negative tests return error envelopes
- `npm run test` passes
- README explains SA context (Apps in ChatGPT + commerce, security/compliance, docs) with links to /mcp-manifest.json and demo UI
```

**Expected Output:** All files created with working implementation.

### 4.3 Review & Tighten

**Command:** `review:codex`

**Prompt:**
```
Cross-file review for: error taxonomy, Zod output validation, correlation ID propagation, CORS strictness, no secrets, DEMO_MODE behavior, manifest no-store, idempotency key handling, tests for negative paths. Suggest exact diffs.
```

**Expected Output:** Review comments with specific suggestions for improvements.

### 4.4 Tests and Documentation

**Command:** `qa:test` then `docify`

**Prompts:**

**QA:**
```
Run tests; add one failing negative-path case if missing; propose minimal fix.
```

**Docifier:**
```
Update README + /docs to reflect tool contracts, error codes, DEMO_MODE, and Cloud Run deploy steps. Include an "SA mapping" section referencing responsibilities (co-build apps in ChatGPT, commerce checkout, security/compliance, partner docs).
```

## Step 5: Verify Setup

Run in sandboxed terminal:

```bash
chmod +x setup.sh
./setup.sh
npm run dev
```

In a new tab:

```bash
# Health check
curl -s http://localhost:8080/healthz | jq

# Ping tool
curl -s -X POST http://localhost:8080/tools/ping \
  -H 'Content-Type: application/json' \
  -d '{"params":{"name":"Nick"}}' | jq

# Open demo UI
open http://localhost:8080

# Run tests
npm run test
```

## Success Criteria

✅ Health check returns `{"ok": true, "status": "ok", ...}`  
✅ Ping tool returns `{"ok": true, "message": "Hello, Nick!", ...}`  
✅ Demo UI loads at http://localhost:8080  
✅ All buttons work (health, ping, shopify, stripe)  
✅ Tests pass (positive and negative cases)  
✅ README includes SA role mapping section  
✅ All documentation files present  

## Next Steps (Future)

- Wire real Shopify Storefront GraphQL API (set `DEMO_MODE=false` and add `SHOPIFY_STOREFRONT_TOKEN`)
- Wire real Stripe Checkout API (set `DEMO_MODE=false` and add `STRIPE_SECRET_KEY`)
- Add Redis caching for product search
- Add Neon database for audit logging
- Deploy to Cloud Run

## Keys & Accounts (Do Later, Not Now)

⚠️ **Do NOT add OpenAI keys to the MCP server.** The server is a tool exposer, not an LLM consumer.

**Stripe:** Create a Stripe test mode account; later set `STRIPE_SECRET_KEY` and wire `checkout.sessions.create` behind `DEMO_MODE=false`.

**Shopify:** Create a Shopify dev store; later set Storefront access token + domain and wire the Storefront GraphQL search behind `DEMO_MODE=false`.

For now, keep `DEMO_MODE=true` and ship the demo. That proves architecture, contracts, error handling, and the enablement docs—exactly what interviewers/partners want to see first.

