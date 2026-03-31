---
name: testing-clickup-cli
description: Run and manage tests for clickup-cli. Covers unit tests, e2e tests against a real ClickUp workspace, and the test data setup. Use when running tests, adding test coverage, debugging test failures, or setting up test fixtures.
metadata:
  internal: true
---

## Test Suite Overview

| Suite | Command            | Files                     | What it tests                                                      |
| ----- | ------------------ | ------------------------- | ------------------------------------------------------------------ |
| Unit  | `npm test`         | `tests/unit/**/*.test.ts` | All commands, API client, formatters, config. Mocks ClickUpClient. |
| E2E   | `npm run test:e2e` | `tests/e2e/**/*.e2e.ts`   | Real API calls against a live ClickUp workspace.                   |

Unit tests run in CI. E2E tests require `CLICKUP_API_TOKEN` in `.env.test` and are not part of CI.

## Running Tests

```bash
npm test                          # all unit tests
npm test -- tests/unit/commands/  # just command tests
npm test -- -t "sprint"           # filter by test name
npm run test:e2e                  # e2e tests (needs .env.test)
```

The unit test global setup runs `npm run build` before tests start.

## E2E Test Workspace

Tests run against the personal ClickUp workspace (profile: `personal`).

### Space: E2E Tests (90166622768)

Pre-populated with test fixtures:

| Fixture            | What it contains                                                              |
| ------------------ | ----------------------------------------------------------------------------- |
| **Sprints folder** | 3 sprint lists with `(M/DD - M/DD)` date ranges. Sprint 2 is "current".       |
| **Backlog list**   | General tasks for CRUD testing. E2E lifecycle tests create/delete tasks here. |
| **Tasks**          | 11 tasks with varied statuses, priorities, assignees, due dates, tags.        |
| **Subtasks**       | 3 subtasks under "Implement user authentication".                             |
| **Checklist**      | "CI Steps" with 5 items (3 resolved).                                         |
| **Tags**           | backend, frontend, security, design, bug.                                     |
| **Comments**       | 2 comments on the auth task.                                                  |
| **Dependencies**   | "Design landing page" depends on "Set up CI pipeline".                        |
| **Overdue task**   | "Fix login redirect bug" in Sprint 1 with past due date.                      |

### Space: ClickUp CLI (90166622769)

Project tracking space. Not used for tests - used for tracking releases and features.

## E2E Test Patterns

### Lifecycle tests (tests/e2e/lifecycle.e2e.ts)

These create test data, verify operations, and clean up:

| Suite          | Tests | Coverage                                                                |
| -------------- | ----- | ----------------------------------------------------------------------- |
| Task lifecycle | 13    | Create, read, update, subtask, comment, checklist, delete, confirm gone |
| Tag lifecycle  | 4     | Add tag, verify, remove, verify removed                                 |
| Time tracking  | 5     | Start timer, check running, stop, log entry, list entries               |

Each suite uses `beforeAll` to find the Backlog list and `afterAll` to clean up created tasks.

### API tests (tests/e2e/api.e2e.ts)

Tests API client methods directly: getSpaces, getLists, getTask, sprint detection.

## Unit Test Patterns

### Mocking ClickUpClient

Every command test mocks the API client with `vi.mock`:

```typescript
const mockGetTask = vi.fn().mockResolvedValue({ id: 't1', name: 'Task' })

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return { getTask: mockGetTask }
  }),
}))
```

The `function` keyword (not arrow) is required for Vitest 4's `new` semantics.

### Testing command functions

Commands export pure functions. Tests import and call them directly:

```typescript
const { updateTask } = await import('../../../src/commands/update.js')
await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { status: 'done' })
expect(mockUpdateTask).toHaveBeenCalledWith('t1', { status: 'done' })
```

### Metadata sync test

`tests/unit/commands/completion.test.ts` verifies that:

1. Every command registered in Commander is listed in `src/commands/metadata.ts`
2. The `docs/commands.md` quick reference section matches what metadata generates

If you add a new command, you MUST add it to metadata.ts. If you add new flags, add them too. Then run `node --import tsx scripts/sync-command-docs.ts` to regenerate the docs.

## Adding New Tests

### New unit test

1. Create `tests/unit/commands/<name>.test.ts`
2. Mock `ClickUpClient` with the methods your command uses
3. Test happy path, error cases, edge cases
4. Run `npm test -- tests/unit/commands/<name>.test.ts`

### New e2e test

1. Add to `tests/e2e/lifecycle.e2e.ts` or create a new `*.e2e.ts` file
2. Use the Backlog list in E2E Tests space for creating test data
3. Always clean up: delete created tasks/checklists in `afterAll`
4. Use `describe.skipIf(!TOKEN)` to skip when no API token is set
5. Run `npm run test:e2e`

## Config for E2E

```bash
# .env.test (gitignored)
CLICKUP_API_TOKEN=pk_...   # personal workspace token
```

Copy from `.env.test.example` and fill in your token.
