# Decisions

Architectural and implementation decisions made during planning and development of the `cu` ClickUp CLI.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Use `node-fetch`-free approach (native `fetch` via Node 20+) | Reduces dependencies; Node 20 ships native fetch, no polyfill needed |
| 2 | Config at `~/.config/cu/config.json` | Follows XDG convention; easy for agents to locate |
| 3 | `lists[]` in config (not spaces) | User requested configurable scope; lists are the smallest addressable unit in ClickUp hierarchy |
| 4 | No `cu config` command | YAGNI - user can edit JSON directly; adding a config command adds complexity with zero benefit for AI agent use case |
| 5 | Initiatives filtered client-side by `task_type` | ClickUp API doesn't support filtering by custom task type server-side; client filter is simplest correct solution |
| 6 | `getMe()` result cached per-client instance | Avoids duplicate `/user` API calls when fetching across multiple lists |
| 7 | Skill lives at `~/.config/opencode/skills/clickup/SKILL.md` | Skills directory pattern for Claude Code; outside project dir as it's user-level config |
| 8 | ESM output (`"type": "module"`) | Node 20+ native, aligns with TypeScript `ESNext` module target; no CJS overhead |
| 9 | Subtasks included by default (`subtasks: true`) | Tasks nested under initiatives are most relevant; can be revisited if too noisy |
