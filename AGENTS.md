# AGENTS.md

## Project Overview

`@krodak/clickup-cli` (`cu` / `cup`) - a ClickUp CLI for AI agents and humans. TypeScript, ESM-only, Node 22+. Three output modes: interactive tables with task picker in TTY, Markdown when piped (optimized for AI context windows), JSON with `--json`. Both `cu` and `cup` are registered as binary names - `cup` avoids conflicts with the Unix `cu(1)` utility.

## Skills

Use the following skills when working on this project:

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
| @inquirer/prompts | Interactive terminal UI                                        |
| chalk             | Terminal colors                                                |

## Project Structure

```
src/
  index.ts          # CLI entry point (Commander setup)
  api.ts            # ClickUp API client (ClickUpClient class + types)
  config.ts         # Config loading (~/.config/cu/config.json)
  output.ts         # TTY detection, table formatting, shouldOutputJson
  interactive.ts    # Task pickers, TTY detail views (chalk)
  markdown.ts       # Markdown detail views (piped output)
  date.ts           # Date formatting helpers
  commands/         # One file per command
tests/
  unit/             # Mirrors src/ structure, *.test.ts
  e2e/              # Integration tests, *.e2e.ts (requires .env.test)
docs/
  commands.md       # Full command reference with examples and flags
skills/
  clickup-cli/      # Agent skill file (SKILL.md with YAML frontmatter)
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
3. Create `tests/unit/commands/<name>.test.ts` with unit tests
4. Update `README.md` with the new command's documentation
5. Update `skills/clickup-cli/SKILL.md` with the new command
6. Update `docs/commands.md` with full reference (examples, flag tables)
7. Add to shell completions in `src/commands/completion.ts` (all 3 shells: bash, zsh, fish)

## Modifying Commands

When adding or changing flags, output formats, or behavior on any command:

1. Update `README.md` to reflect the change
2. Update `skills/clickup-cli/SKILL.md` to reflect the change
3. Update `docs/commands.md` with the change
4. Update the command count in `README.md` if commands were added/removed

## ClickUp API

- The API client is in `src/api.ts` (`ClickUpClient` class)
- The ClickUp API returns inconsistent types across endpoints (numbers vs strings for IDs). Always use `Number()` coercion when comparing IDs client-side.
- The View Tasks API (`GET /view/{id}/task`) returns all tasks visible in a view, including multi-list tasks. The List Tasks API (`GET /list/{id}/task`) only returns tasks whose primary list matches. Prefer the View API when you need complete task coverage.
- Pagination uses `{ tasks: Task[], last_page: boolean }` response format

## Pre-Commit Checklist

Before committing, verify all of these pass:

1. `npm run typecheck` - no type errors
2. `npm run lint` - no lint errors
3. `npm test` - all unit tests pass
4. `npm run build` - build succeeds
5. Update `README.md` if adding/changing commands or CLI behavior

## README Format

The README API Coverage section uses a status table with GitHub emoji indicators:

- `:white_check_mark:` - implemented
- `:construction:` - planned
- `:no_entry_sign:` - won't add

Commands are grouped by purpose (Tasks, Comments, Checklists, etc.), not by read/write. When implementing a planned feature, change its status from `:construction:` to `:white_check_mark:` and add the command.

The "Won't add" section explains why each feature was excluded. Keep reasons short and direct.

The Setup section uses foldable `<details>` blocks with badge icons for each tool (Claude Code, Codex, OpenCode, Homebrew, npm).

## Release Process

Releases are automated via GitHub Actions using npm Trusted Publishers (OIDC).

1. Bump version: `npm version <0.X.0> --no-git-tag-version` (use explicit version, not patch/minor/major - those auto-increment from current, which may not be what you want)
2. Update `.claude-plugin/plugin.json` version to match
3. Commit the version bump: `git commit -m "bump v0.X.0"`
4. Tag: `git tag v0.X.0`
5. Push commit and tag: `git push origin main --tags`
6. CI handles: typecheck, test, build, `npm publish --provenance`, and GitHub Release creation (empty auto-generated notes)
7. Update the GitHub Release with hand-written release notes via `gh release edit v0.X.0 --notes "..."` - the CI-generated notes are just a changelog link, not useful
8. After npm publish succeeds, update the Homebrew tap (see below)

Do NOT publish manually. Do NOT use `NODE_AUTH_TOKEN` - the release pipeline uses OIDC trusted publishers for authentication.

### Release Notes Style

Release notes are written after CI publishes, via `gh release edit`. The format:

- H2 heading per new command or feature group
- Code block with 2-3 usage examples
- Brief description of what the command does (1-2 sentences)
- "Other Changes" section at the bottom for non-command changes
- End with test count ("492 tests across 43 files")
- No emojis, no marketing language, no "we're excited" preamble

### npm Trusted Publishers Requirements

The release workflow uses OIDC trusted publishing, which requires npm CLI 11.5.1+ (ships with Node 24+). The `release.yml` workflow MUST use `node-version: '24'` or higher. Node 22 ships with npm 10.x which does not support trusted publishers and will fail with `E404` / expired token errors.

The trusted publisher must be configured on npmjs.com under the package settings (Trusted Publisher - GitHub Actions) with: workflow filename = `release.yml` (case-sensitive, exact match).

The release workflow uses `--ignore-scripts` to skip the `prepublishOnly` hook during publish (the CI steps already ran typecheck/test/build). This avoids redundant work and keeps the OIDC token fresh.

## CI Pipelines

- **CI** (`ci.yml`) - runs on push to main and PRs: typecheck, lint, format:check, test, build
- **Release** (`release.yml`) - runs on `v*` tags: typecheck, test, build, npm publish with provenance, and GitHub Release creation. **Must use Node 24** for OIDC.
- **Dependabot** - weekly updates for npm and GitHub Actions dependencies

## Testing Guidelines

- Unit tests mock the ClickUp API client (`vi.mock` with factory returning mock constructor)
- Use `vi.mock` for module-level mocks (output, config)
- E2E tests hit the real ClickUp API and need `CLICKUP_API_TOKEN` in `.env.test`
- Never commit `.env.test` - copy from `.env.test.example`
- The unit test global setup runs `npm run build` before the test suite
