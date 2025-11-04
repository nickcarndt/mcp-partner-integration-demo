# Cursor Setup Guide

Complete guide for setting up the multi-agent workflow in Cursor.

## 1. Create Agent Profiles (Multi-Agents)

In Cursor sidebar → Multi-Agents, create four profiles:

### 🧭 Architect (Planner)
- **Model:** Composer (Default)
- **Prompt:** See `docs/agent-profiles.md` - Architect section

### 🛠 Implementer (Builder)
- **Model:** Composer (Default)
- **Prompt:** See `docs/agent-profiles.md` - Implementer section

### 🔍 Reviewer (Code Review)
- **Model:** GPT-5 Codex (Secondary)
- **Prompt:** See `docs/agent-profiles.md` - Reviewer section

### ✅ QA (Tests)
- **Model:** Composer (Default)
- **Prompt:** See `docs/agent-profiles.md` - QA section

## 2. Configure Team Rules

Dashboard → Team → Rules

Paste the rules from `docs/team-rules.md`:

```
rules:
  - "Architect must produce a step plan, impacted file list, risks, and backout plan before any edits."
  - "Implementer may only modify files listed by Architect."
  - "Reviewer uses GPT-5 Codex; block merges >300 LOC unless plan is REFAC."
  - "QA must run tests before proposing code changes."
  - "Never commit secrets; use .env.example. No LLM SDKs in MCP server."
  - "MCP server exposes tools only; no LLM calls; return clean JSON."
  - "Use DEMO_MODE=true for mocks; preserve contract when switching to real APIs."
  - "Every user-visible change updates README and /docs (Implementation Guide/FAQ/Runbook)."
  - "One branch per feature; one worktree per agent when parallelizing."
```

## 3. Configure Team Commands

Dashboard → Team → Commands

Paste the JSON from `docs/team-commands.json`:

```json
[
  {
    "name": "plan:feature",
    "model": "Composer",
    "prompt": "You are Architect. Produce steps, impacted files, risks, backout. No code."
  },
  {
    "name": "build:feature",
    "model": "Composer",
    "prompt": "You are Implementer. Follow latest plan strictly. Minimal typed diffs + tests."
  },
  {
    "name": "review:codex",
    "model": "GPT-5 Codex",
    "prompt": "You are Reviewer. Cross-file review. Summarize diffs, highlight risks, propose fixes."
  },
  {
    "name": "qa:test",
    "model": "Composer",
    "prompt": "You are QA. Generate/execute tests. Report failures with file:line and assertion."
  },
  {
    "name": "docify",
    "model": "Composer",
    "prompt": "You are Docifier. Update README & /docs to match latest tool contracts and endpoints."
  }
]
```

## 4. Configure Sandboxed Terminals

Dashboard → Team → Sandboxed Terminals

Enable sandboxing and allowlist these npm scripts:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run fmt`
- `npm run smoke`

## 5. Configure Settings

Cursor → Settings

### Models
- **Default:** Composer
- **Secondary:** GPT-5 Codex (bind to review:codex)

### Agents
- ✅ Enable Multi-Agents
- ✅ Parallel: 2–4 agents
- ✅ Enable Cloud Agents (for heavy jobs)

### Browser
- ✅ Enable Browser (GA) for Agent
- ✅ Allow DOM selection

### Terminals
- ✅ Sandboxed Terminals ON
- ✅ Allowlist npm scripts (see above)

### Plan Mode
- ✅ Enabled
- **Plan with:** Composer
- **Build with:** Codex (for risky refactors)

### Prompt UI
- Keep inline file pills
- Rely on self-gather context

### Memory/Perf
- Prefer one large repo per workspace
- Close stale diffs before long runs

## 6. Voice Mode (Optional)

Set a keyword (e.g., "ship it") → triggers the current command.

## 7. Workflow Usage

### Feature Development Loop

1. **Plan:**
   ```
   plan:feature
   ```
   - Run with Architect profile
   - Review and approve steps/backout plan

2. **Build (Parallel):**
   ```
   build:feature    # Implementer
   qa:test          # QA
   ```
   - Run both in parallel using Multi-Agents
   - Cursor automatically uses worktrees

3. **Review:**
   ```
   review:codex
   ```
   - Run with Reviewer profile
   - Fix issues and re-review

4. **Document:**
   ```
   docify
   ```
   - Update README and docs

5. **Merge:**
   - Create PR
   - Merge when approved

### Success Criteria

Every prompt should end with:

✅ Done when:
- Health & tools respond
- Diff < 300 LOC
- Tests pass
- README & /docs updated

## 8. Tips

### Naming Agents
Use emojis to see states at a glance:
- 🧭 Architect
- 🛠 Implementer
- 🔍 Reviewer
- ✅ QA

### Parallel Execution
- Use Multi-Agents feature
- Cursor handles worktree isolation
- One branch per feature

### Browser (GA) Usage
- Use for documentation-heavy tasks
- Select DOM elements on Shopify/Stripe docs
- Extract precise snippets for implementation

### Prompt Formatting
Always end prompts with success criteria:
```
✅ Done when:
- [Specific check 1]
- [Specific check 2]
- [Specific check 3]
```

## Troubleshooting

### Agent not following rules
- Verify rules are pasted correctly in Team → Rules
- Check agent profile prompt matches documentation

### Commands not working
- Verify commands JSON is valid
- Check model assignments match available models

### Sandboxed terminal blocking
- Verify npm scripts are in allowlist
- Use npm scripts instead of raw shell commands

### Worktree conflicts
- Ensure one branch per feature
- Let Cursor handle worktree creation automatically

