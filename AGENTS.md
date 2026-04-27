# AGENTS.md

## Project Overview

`@krodak/clickup-cli` (`cup`) - a ClickUp CLI for AI agents and humans. TypeScript, ESM-only, Node 22+. Dual-mode output: **TTY** runs interactive prompts via @inquirer/prompts (task picker with vim-style j/k navigation, select/confirm dialogs); **piped** outputs Markdown optimized for AI context windows; `--json` forces structured JSON in either mode. The binary is `cup` - the previous `cu` name was retired to avoid conflict with the Unix `cu(1)` utility.

## Project Skills

This repo includes project-level agent skills in `.agents/skills/`:

| Skill                     | When to use                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **releasing-clickup-cli** | Releasing a new version (npm, Homebrew, GitHub Release, skill sync). Follow this skill exactly - it prevents version/docs/metadata mistakes. |
| **testing-clickup-cli**   | Running tests, adding test coverage, debugging failures. Documents unit test patterns, e2e workspace fixtures, and the metadata sync test.   |

Use these skills for releasing and testing instead of the sections below - they have full step-by-step instructions.

## External Skills

- **typescript-pro** - for all TypeScript work. The project uses strict mode, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, and `typescript-eslint` recommendedTypeChecked rules.
- **cli-developer** - for CLI design, argument parsing, interactive prompts, and shell completions. The project uses Commander for CLI framework, @inquirer/prompts for interactive UI, and chalk for colors.

## Tech Stack

| Tool              | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| TypeScript        | strict, ES2022 target, NodeNext modules                        |
| tsup              | Build - single ESM bundle to `dist/index.js`                   |
| Vitest            | Unit tests (`tests/unit/`) and e2e tests (`tests/e2e/`)        |
| ESLint 10         | Flat config with typescript-eslint recommendedTypeChecked      |
| Prettier          | No semicolons, single quotes, trailing commas, 100 print width |
| Commander         | CLI framework                                                  |
| @inquirer/prompts | Interactive terminal UI (task picker, select/confirm prompts)  |
| chalk             | Terminal colors (TTY only)                                     |

## Project Structure

```
src/
  index.ts          # CLI entry point (Commander setup)
  api.ts            # ClickUp API client (ClickUpClient class + types)
  config.ts         # Config loading (~/.config/cup/config.json)
  output.ts         # TTY detection, table formatting, shouldOutputJson
  interactive.ts    # Interactive TUI: task picker (checkbox navigation with j/k + arrows), detail views, browser-open prompts
  markdown.ts       # Markdown detail views (piped output)
  date.ts           # Date formatting helpers
  commands/         # One file per command
tests/
  unit/             # Mirrors src/ structure, *.test.ts
  e2e/              # Integration tests, *.e2e.ts (requires .env.test)
docs/
  commands.md       # Full command reference with examples and flags
  api-coverage.md   # API coverage matrix with status indicators
skills/
  clickup-cli/      # Agent skill file shipped with npm package
.agents/skills/
  using-clickup-cli/ # Agent skill (canonical location for npx skills add)
  releasing-clickup-cli/ # Internal: release process (metadata.internal: true)
  testing-clickup-cli/   # Internal: test guide (metadata.internal: true)
.claude-plugin/
  plugin.json       # Claude Code plugin manifest
```

## Development Commands

```bash
npm install         # Install dependencies
npm test            # Unit tests (runs build first via globalSetup)
npm run test:e2e    # E2E tests (requires CLICKUP_API_TOKEN in .env.test)
npm run build       # tsup -> dist/
npm run dev         # Run from source via tsx
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run lint:fix    # ESLint with auto-fix
npm run format      # Prettier write
npm run format:check # Prettier check
```

## Code Conventions

- ESM only - all imports use `.js` extensions (`import { foo } from './bar.js'`)
- No inline comments - code should be self-documenting through naming
- Unused variables prefixed with `_` (enforced by ESLint)
- No floating promises (enforced by ESLint `no-floating-promises: error`)
- Use `type` imports for type-only imports (`import type { Foo }`)
- Every command lives in its own file under `src/commands/`
- Every command file has a corresponding test file under `tests/unit/commands/`

## Adding a New Command

1. Create `src/commands/<name>.ts` with the command logic
2. Register the command in `src/index.ts` using Commander
3. Add to `src/commands/metadata.ts` (completion test will fail otherwise)
4. Create `tests/unit/commands/<name>.test.ts` with unit tests
5. Update `README.md` with the new command's documentation
6. Update `skills/clickup-cli/SKILL.md` with the new command (`.agents/skills/using-clickup-cli/SKILL.md` is a symlink to it)
7. Update `docs/commands.md` with full reference (examples, flag tables)
8. Sync docs quick reference: `node --import tsx scripts/sync-command-docs.ts`
9. If you added a new subcommand group with bespoke completions, update `src/commands/completion.ts`. Top-level flags are picked up automatically from metadata.

## Modifying Commands

When adding or changing flags, output formats, or behavior on any command:

1. Update `README.md` to reflect the change
2. Update `skills/clickup-cli/SKILL.md` to reflect the change
3. Update `docs/commands.md` with the change
4. Add new flags to `src/commands/metadata.ts`
5. Sync docs: `node --import tsx scripts/sync-command-docs.ts`

## ClickUp API

- The API client is in `src/api.ts` (`ClickUpClient` class)
- v2 endpoints use `request()`, v3 (Docs) uses `requestV3()`, both via shared `_fetch()`
- The ClickUp API returns inconsistent types across endpoints (numbers vs strings for IDs). Always use `Number()` coercion when comparing IDs client-side.
- Pagination uses `paginate()` with `MAX_PAGES=100` safety limit

## Pre-Commit Checklist

Before committing, verify all of these pass:

1. `npm run typecheck` - no type errors
2. `npm run lint` - no lint errors
3. `npm test` - all unit tests pass
4. `npm run build` - build succeeds
5. Update `README.md` if adding/changing commands or CLI behavior

## README Format

The README "What it covers" section is a compact feature summary. Full API coverage details are in `docs/api-coverage.md` with GitHub emoji indicators (`:white_check_mark:`, `:construction:`, `:no_entry_sign:`).

The Setup section uses foldable `<details>` blocks with badge icons. `cup skill` is the primary install method.

## Release Process

See the **releasing-clickup-cli** project skill for full step-by-step instructions. Key points:

- `npm version <version> --no-git-tag-version` bumps `package.json` and `package-lock.json`
- `node --import tsx scripts/sync-command-docs.ts` syncs:
  - `docs/commands.md` quick reference table
  - `skills/clickup-cli/SKILL.md` version header and version check line
  - `.claude-plugin/plugin.json` version
- The `version synchronization` test in `tests/unit/` catches drift in CI
- Tag triggers CI which publishes to npm via OIDC
- Update Homebrew tap manually after npm publish
- Release workflow MUST use Node 24+ for OIDC trusted publishers

## CI Pipelines

- **CI** (`ci.yml`) - runs on push to main and PRs: typecheck, lint, format:check, test, build
- **Release** (`release.yml`) - runs on `v*` tags: typecheck, test, build, npm publish with provenance, and GitHub Release creation
- **Dependabot** - weekly updates for npm and GitHub Actions dependencies

## Testing

See the **testing-clickup-cli** project skill for full guide including e2e workspace fixtures and test patterns.

Key facts:

- Unit tests use `vi.mock` with factory returning mock constructor (Vitest 4 requires `function`, not arrow)
- E2E tests run against personal ClickUp workspace (E2E Tests space)
- The completion test in `tests/unit/commands/completion.test.ts` verifies metadata.ts stays in sync with Commander and docs/commands.md
