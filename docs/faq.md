# FAQ

## General

### What is this project?
An MCP (Model Context Protocol) HTTP server that exposes tools via REST endpoints, designed for use with multi-agent workflows in Cursor.

### How do I start the server?
```bash
npm run dev
```

### How do I test the server?
```bash
npm run smoke
```

Or manually:
```bash
curl -s http://localhost:8080/healthz | jq
curl -s -X POST http://localhost:8080/tools/ping -H 'Content-Type: application/json' -d '{"params":{"name":"Nick"}}' | jq
```

## Multi-Agent Workflow

### How do I use the agent profiles?
1. Create agent profiles in Cursor sidebar (Multi-Agents)
2. Use the prompts from `docs/agent-profiles.md`
3. Run commands from `docs/team-commands.json`

### How do I parallelize agents?
Use Cursor's Multi-Agents feature with worktrees. Each agent operates in its own worktree automatically.

### What's the workflow?
1. `plan:feature` (Architect) → approve steps/backout
2. Parallel: `build:feature` (Implementer) + `qa:test` (QA)
3. `review:codex` (Reviewer) → fix → re-review
4. `docify` → push
5. Merge

## Development

### How do I add a new tool?
See `docs/implementation-guide.md` for the pattern. Follow:
1. Define Zod schema
2. Add tool handler
3. Add route
4. Update docs

### How do I handle secrets?
Never commit secrets. Use `.env` (gitignored) and provide `.env.example` with placeholders.

### What's DEMO_MODE?
A flag to enable mocked behavior. Preserve the contract when switching to real APIs.

## Troubleshooting

### Server won't start
- Check Node.js version (18+ required)
- Check if port 8080 is available
- Verify dependencies: `npm install`

### Tests failing
- Run `npm run typecheck` first
- Check for linting errors: `npm run lint`
- Verify test setup

### Agent not following plan
- Ensure Architect produced a complete plan
- Check if files are listed in plan
- Verify Implementer is using correct profile

