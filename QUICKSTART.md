# Quick Start Guide

## 1. Setup Project

```bash
./setup.sh
```

## 2. Start Server

```bash
npm run dev
```

## 3. Test Server

```bash
npm run smoke
```

Or manually:
```bash
curl -s http://localhost:8080/healthz | jq
curl -s -X POST http://localhost:8080/tools/ping -H 'Content-Type: application/json' -d '{"params":{"name":"Nick"}}' | jq
```

## 4. Configure Cursor

See `docs/cursor-setup-guide.md` for complete Cursor configuration.

**For building from scratch:** See `CURSOR_WORKFLOW.md` for the complete multi-agent workflow guide.

### Quick Setup:

1. **Create Agent Profiles** (Multi-Agents sidebar):
   - 🧭 Architect (Composer)
   - 🛠 Implementer (Composer)
   - 🔍 Reviewer (GPT-5 Codex)
   - ✅ QA (Composer)

2. **Add Team Rules** (Dashboard → Team → Rules):
   - Paste from `docs/team-rules.md`

3. **Add Team Commands** (Dashboard → Team → Commands):
   - Paste from `docs/team-commands.json`

4. **Configure Sandboxed Terminals**:
   - Allowlist npm scripts from `package.json`

## 5. Feature Development Workflow

1. `plan:feature` → Architect creates plan
2. `build:feature` + `qa:test` → Parallel execution
3. `review:codex` → Code review
4. `docify` → Update documentation
5. Merge → Complete

## Files to Reference

- **Agent Profiles:** `docs/agent-profiles.md`
- **Team Rules:** `docs/team-rules.md`
- **Team Commands:** `docs/team-commands.json`
- **Cursor Setup:** `docs/cursor-setup-guide.md`
- **Implementation:** `docs/implementation-guide.md`
- **FAQ:** `docs/faq.md`
- **Runbook:** `docs/runbook.md`

