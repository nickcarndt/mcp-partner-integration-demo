# Team Rules

These guardrails ensure every agent behaves consistently across the project.

## Core Rules

1. **Architect must produce a step plan, impacted file list, risks, and backout plan before any edits.**

2. **Implementer may only modify files listed by Architect.**

3. **Reviewer uses GPT-5 Codex; block merges >300 LOC unless plan is REFAC.**

4. **QA must run tests before proposing code changes.**

5. **Never commit secrets; use .env.example. No LLM SDKs in MCP server.**

6. **MCP server exposes tools only; no LLM calls; return clean JSON.**

7. **Use DEMO_MODE=true for mocks; preserve contract when switching to real APIs.**

8. **Every user-visible change updates README and /docs (Implementation Guide/FAQ/Runbook).**

9. **One branch per feature; one worktree per agent when parallelizing.**

## Implementation Details

### Secrets Management
- All secrets must be in `.env` (gitignored)
- Provide `.env.example` with placeholder values
- Never hardcode API keys, tokens, or credentials
- Use environment variables for all configuration

### MCP Server Constraints
- MCP server exposes tools only (no LLM calls)
- Return clean JSON responses
- No LLM SDKs (OpenAI, Anthropic, etc.) in MCP server code
- Keep tool contracts stable

### Testing Requirements
- Run tests before proposing code changes
- Report failures with file:line and assertion
- Propose minimal fixes or escalate to Implementer

### Documentation Requirements
- Update README for user-facing changes
- Update `/docs` for implementation details
- Keep Implementation Guide, FAQ, and Runbook current

### Code Quality
- Type-safe code (TypeScript strict mode)
- Error envelopes (structured error responses)
- Zod validation for all inputs
- Logging with correlation IDs
- DEMO_MODE guards for mocked behavior

### Diff Size Limits
- Keep diffs < 300 LOC per PR
- Mark REFAC in plan for larger refactors
- Reviewer blocks merges > 300 LOC unless REFAC

### Branching Strategy
- One branch per feature
- One worktree per agent when parallelizing
- Use feature branches: `feat/feature-name`

