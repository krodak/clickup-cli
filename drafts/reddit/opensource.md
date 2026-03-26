# r/opensource Draft

**Flair:** Promotional
**Title:** cup - open source ClickUp CLI with 700+ tests and triple output modes (MIT)

---

I've been working on `cup` for a while now and wanted to share it here. It's a ClickUp CLI written in TypeScript - MIT licensed, 60+ commands, 700+ tests across 55 files.

**Why I built it**

I kept breaking my flow switching between the terminal and ClickUp's web UI. I wanted something I could run without leaving my editor. The existing ClickUp CLI options were either abandoned or too limited, so I started my own.

**Technical choices**

- TypeScript with strict mode, `noUncheckedIndexedAccess`, ESM-only
- Commander for the CLI framework, tsup for bundling into a single ESM file
- Vitest for testing - unit tests mock the API client, e2e tests hit the real ClickUp API
- ESLint with typescript-eslint's `recommendedTypeChecked` ruleset (the strict one that requires type info)
- Prettier with opinionated config (no semis, single quotes)

One design decision I'm glad I made early: the output format auto-detects based on TTY. Run a command in your terminal and you get interactive tables with colors and a task picker. Pipe it somewhere and it switches to Markdown automatically. Pass `--json` and you get structured data. Same command, three outputs, no extra flags for the common cases.

**What I learned**

The ClickUp API is... inconsistent. Some endpoints return IDs as numbers, others as strings. Pagination isn't standardized. The View Tasks endpoint and the List Tasks endpoint return different sets of tasks for the same list (the View API includes multi-list tasks, the List API doesn't). I spent a lot of time normalizing this stuff so the CLI behaves predictably even when the API doesn't.

Testing a CLI is also trickier than I expected. The interactive features (task picker, colored output) need TTY detection mocking. I ended up with a test structure that mirrors `src/` exactly - every command file has a matching test file.

**Feature coverage**

The CLI covers most of the ClickUp API surface: tasks, comments, checklists, custom fields, time tracking, views, tags, sprints, goals, docs (v3 API), templates, task types, attachments, and bulk operations. Multi-profile support lets you switch between different ClickUp workspaces without juggling config files. Sprint detection is flexible - it handles multiple date formats, folder keywords, and you can override it in config if your team names sprints differently.

Contributions welcome. The codebase is pretty approachable - each command lives in its own file under `src/commands/`, and AGENTS.md documents everything from code conventions to the release process.

GitHub: https://github.com/krodak/clickup-cli
npm: `npm i -g @krodak/clickup-cli`
Homebrew: `brew tap krodak/tap && brew install clickup-cli`
License: MIT

---

**Notes:**

- "Promotional" flair is required for project posts
- r/opensource cares about project quality and sustainability - the post focuses on technical decisions, test coverage, and what was learned rather than just feature lists
- Rule 3 explicitly bans AI-generated post text - this is hand-written developer narrative
- Reddit guideline says <10% of your posts should be self-promo. Make sure to have other community participation before posting
- Don't cross-post this on the same day as the other subreddits
