# AGENTS.md

## Project Overview

`@krodak/clickup-cli` (`cu`) - a ClickUp CLI for AI agents and humans. TypeScript, ESM-only, Node 22+. Two modes: interactive tables with task picker in TTY, raw JSON when piped.

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
  api.ts            # ClickUp API client
  config.ts         # Config loading (~/.config/cu/config.json)
  output.ts         # TTY detection, table formatting
  interactive.ts    # Task pickers, detail views
  commands/         # One file per command (19 commands)
tests/
  unit/             # Mirrors src/ structure, *.test.ts
  e2e/              # Integration tests, *.e2e.ts (requires .env.test)
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
4. Update README.md with the new command's documentation

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

## Release Process

Releases are automated via GitHub Actions using npm Trusted Publishers (OIDC).

1. Bump version: `npm version patch|minor|major --no-git-tag-version`
2. Commit the version bump
3. Tag: `git tag v<version>`
4. Push commit and tag: `git push origin main --tags`
5. CI handles: typecheck, test, build, and `npm publish --provenance`

Do NOT publish manually. Do NOT use `NODE_AUTH_TOKEN` - the release pipeline uses OIDC trusted publishers for authentication.

## CI Pipelines

- **CI** (`ci.yml`) - runs on push to main and PRs: typecheck, lint, format:check, test, build
- **Release** (`release.yml`) - runs on `v*` tags: typecheck, test, build, npm publish with provenance
- **Dependabot** - weekly updates for npm and GitHub Actions dependencies

## Testing Guidelines

- Unit tests mock the ClickUp API client (`vi.spyOn(ClickUpClient.prototype, ...)`)
- Use `vi.mock` for module-level mocks (output, config)
- E2E tests hit the real ClickUp API and need `CLICKUP_API_TOKEN` in `.env.test`
- Never commit `.env.test` - copy from `.env.test.example`
- The unit test global setup runs `npm run build` before the test suite
