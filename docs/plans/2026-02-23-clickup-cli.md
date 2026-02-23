# ClickUp CLI (`cu`) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a TypeScript CLI called `cu` for AI agents to interact with ClickUp - fetch tasks/initiatives, update descriptions, and create tasks.

**Architecture:** Commander.js CLI installed globally via `npm link` or `npm install -g`. Config lives at `~/.config/cu/config.json` (apiToken, teamId, configuredLists). All output is JSON to stdout, errors to stderr with non-zero exit code.

**Tech Stack:** TypeScript, Commander.js, Vitest (tests), tsup (build), Node 20+ native fetch.

---

## Decisions

See `DECISIONS.md` for all architectural decisions made during planning/implementation.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts` (entry point, empty)

**Step 1: Write `package.json`**

```json
{
  "name": "clickup-cli",
  "version": "0.1.0",
  "description": "ClickUp CLI for AI agents",
  "type": "module",
  "bin": {
    "cu": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

**Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: Write `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
})
```

**Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node'
  }
})
```

**Step 5: Write `.gitignore`**

```
node_modules/
dist/
*.env
.env
```

**Step 6: Write empty `src/index.ts`**

```ts
// entry point - populated in Task 3
```

**Step 7: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

**Step 8: Verify build works**

```bash
npm run build
```

Expected: `dist/index.js` created.

**Step 9: Commit**

```bash
git add -A && git commit -m "chore: initial project scaffold"
```

---

## Task 2: Config Module

**Files:**
- Create: `src/config.ts`
- Create: `src/config.test.ts`

**Step 1: Write the failing test**

```ts
// src/config.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { homedir } from 'os'
import { join } from 'path'
import fs from 'fs'

// We'll mock fs to avoid touching real filesystem
vi.mock('fs')

describe('loadConfig', () => {
  it('throws with helpful message when config file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('Config file not found')
  })

  it('returns parsed config when file exists', async () => {
    const mockConfig = {
      apiToken: 'pk_test123',
      teamId: 'team_456',
      lists: ['list_1', 'list_2']
    }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig))
    const { loadConfig } = await import('./config.js')
    const config = loadConfig()
    expect(config.apiToken).toBe('pk_test123')
    expect(config.teamId).toBe('team_456')
    expect(config.lists).toEqual(['list_1', 'list_2'])
  })

  it('throws when apiToken is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ teamId: 'team_456', lists: [] }))
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('apiToken')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - `loadConfig` not implemented.

**Step 3: Implement `src/config.ts`**

```ts
import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface Config {
  apiToken: string
  teamId: string
  lists: string[]
}

const CONFIG_PATH = join(homedir(), '.config', 'cu', 'config.json')

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `Config file not found at ${CONFIG_PATH}.\nCreate it with:\n{\n  "apiToken": "pk_...",\n  "teamId": "...",\n  "lists": ["list_id_1", "list_id_2"]\n}`
    )
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<Config>

  if (!parsed.apiToken) throw new Error('Config missing required field: apiToken')
  if (!parsed.teamId) throw new Error('Config missing required field: teamId')
  if (!parsed.lists) throw new Error('Config missing required field: lists')

  return {
    apiToken: parsed.apiToken,
    teamId: parsed.teamId,
    lists: parsed.lists
  }
}

export function getConfigPath(): string {
  return CONFIG_PATH
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: All config tests PASS.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add config module"
```

---

## Task 3: ClickUp API Client

**Files:**
- Create: `src/api.ts`
- Create: `src/api.test.ts`

**Step 1: Write failing tests**

```ts
// src/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data)
  })
}

describe('ClickUpClient', () => {
  let client: import('./api.js').ClickUpClient

  beforeEach(async () => {
    vi.clearAllMocks()
    const { ClickUpClient } = await import('./api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team_1' })
  })

  it('fetches tasks from a list', async () => {
    mockFetch.mockReturnValue(mockResponse({ tasks: [{ id: 't1', name: 'Test task' }] }))
    const tasks = await client.getTasksFromList('list_1')
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe('t1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/list/list_1/task'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'pk_test' }) })
    )
  })

  it('filters by assignee using teamId to get current user', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ user: { id: 42 } })) // getMe
      .mockReturnValueOnce(mockResponse({ tasks: [] }))
    const tasks = await client.getMyTasksFromList('list_1')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('updates task description', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 't1', description: 'updated' }))
    await client.updateTaskDescription('t1', 'updated description')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1'),
      expect.objectContaining({ method: 'PUT' })
    )
  })

  it('creates a task in a list', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 't2', name: 'New task' }))
    const task = await client.createTask('list_1', { name: 'New task' })
    expect(task.id).toBe('t2')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/list/list_1/task'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws on API error with message', async () => {
    mockFetch.mockReturnValue(mockResponse({ err: 'Not found' }, false))
    await expect(client.getTasksFromList('bad_list')).rejects.toThrow()
  })
})
```

**Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL - `ClickUpClient` not implemented.

**Step 3: Implement `src/api.ts`**

```ts
const BASE_URL = 'https://api.clickup.com/api/v2'

export interface Task {
  id: string
  name: string
  description?: string
  status: { status: string; color: string }
  task_type?: string
  assignees: Array<{ id: number; username: string }>
  url: string
  list: { id: string; name: string }
  parent?: string
}

export interface CreateTaskOptions {
  name: string
  description?: string
  parent?: string
  status?: string
}

interface ClientConfig {
  apiToken: string
  teamId: string
}

export class ClickUpClient {
  private apiToken: string
  private teamId: string
  private meCache: { id: number } | null = null

  constructor(config: ClientConfig) {
    this.apiToken = config.apiToken
    this.teamId = config.teamId
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: this.apiToken,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    const data = await res.json() as Record<string, unknown>
    if (!res.ok) {
      throw new Error(`ClickUp API error ${res.status}: ${data.err ?? JSON.stringify(data)}`)
    }
    return data as T
  }

  async getMe(): Promise<{ id: number; username: string }> {
    if (this.meCache) return this.meCache
    const data = await this.request<{ user: { id: number; username: string } }>('/user')
    this.meCache = data.user
    return data.user
  }

  async getTasksFromList(listId: string, params: Record<string, string> = {}): Promise<Task[]> {
    const qs = new URLSearchParams({ subtasks: 'true', ...params }).toString()
    const data = await this.request<{ tasks: Task[] }>(`/list/${listId}/task?${qs}`)
    return data.tasks
  }

  async getMyTasksFromList(listId: string): Promise<Task[]> {
    const me = await this.getMe()
    return this.getTasksFromList(listId, { assignees: String(me.id) })
  }

  async updateTaskDescription(taskId: string, description: string): Promise<Task> {
    return this.request<Task>(`/task/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ description })
    })
  }

  async createTask(listId: string, options: CreateTaskOptions): Promise<Task> {
    return this.request<Task>(`/list/${listId}/task`, {
      method: 'POST',
      body: JSON.stringify(options)
    })
  }
}
```

**Step 4: Run tests**

```bash
npm test
```

Expected: All API tests PASS.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add ClickUp API client"
```

---

## Task 4: `cu tasks` and `cu initiatives` Commands

**Files:**
- Create: `src/commands/tasks.ts`
- Create: `src/commands/tasks.test.ts`

**Note on task types:** ClickUp custom task types are stored in `task.task_type`. Initiatives will have `task_type === 'Initiative'`. Regular tasks have `task_type === 'task'` or undefined.

**Step 1: Write failing tests**

```ts
// src/commands/tasks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMyTasksFromList: vi.fn().mockResolvedValue([
      { id: 't1', name: 'Regular task', task_type: 'task', status: { status: 'open' }, url: 'http://cu/t1', list: { id: 'l1', name: 'L1' }, assignees: [] },
      { id: 't2', name: 'Initiative task', task_type: 'Initiative', status: { status: 'open' }, url: 'http://cu/t2', list: { id: 'l1', name: 'L1' }, assignees: [] }
    ])
  }))
}))

describe('fetchMyTasks', () => {
  it('returns all tasks when no type filter', async () => {
    const { fetchMyTasks } = await import('./tasks.js')
    const result = await fetchMyTasks({ apiToken: 'pk_t', teamId: 'tm_1', lists: ['l1'] })
    expect(result).toHaveLength(2)
  })

  it('filters by task_type when provided', async () => {
    const { fetchMyTasks } = await import('./tasks.js')
    const result = await fetchMyTasks({ apiToken: 'pk_t', teamId: 'tm_1', lists: ['l1'] }, 'Initiative')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t2')
  })
})
```

**Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL - module not found.

**Step 3: Implement `src/commands/tasks.ts`**

```ts
import { ClickUpClient, Task } from '../api.js'
import { Config } from '../config.js'

export interface TaskSummary {
  id: string
  name: string
  status: string
  task_type: string
  list: string
  url: string
  parent?: string
}

function summarize(task: Task): TaskSummary {
  return {
    id: task.id,
    name: task.name,
    status: task.status.status,
    task_type: task.task_type ?? 'task',
    list: task.list.name,
    url: task.url,
    ...(task.parent ? { parent: task.parent } : {})
  }
}

export async function fetchMyTasks(config: Config, typeFilter?: string): Promise<TaskSummary[]> {
  const client = new ClickUpClient(config)
  const allTasks: Task[] = []

  for (const listId of config.lists) {
    const tasks = await client.getMyTasksFromList(listId)
    allTasks.push(...tasks)
  }

  const filtered = typeFilter
    ? allTasks.filter(t => t.task_type === typeFilter)
    : allTasks

  return filtered.map(summarize)
}
```

**Step 4: Run tests**

```bash
npm test
```

Expected: All tasks tests PASS.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add tasks/initiatives fetch command logic"
```

---

## Task 5: `cu update` Command

**Files:**
- Create: `src/commands/update.ts`
- Create: `src/commands/update.test.ts`

**Step 1: Write failing tests**

```ts
// src/commands/update.test.ts
import { describe, it, expect, vi } from 'vitest'

const mockUpdateDesc = vi.fn().mockResolvedValue({ id: 't1', name: 'Task', description: 'new desc' })

vi.mock('../api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    updateTaskDescription: mockUpdateDesc
  }))
}))

describe('updateDescription', () => {
  it('calls API with correct task id and description', async () => {
    const { updateDescription } = await import('./update.js')
    const result = await updateDescription(
      { apiToken: 'pk_t', teamId: 'tm_1', lists: [] },
      't1',
      'new description'
    )
    expect(mockUpdateDesc).toHaveBeenCalledWith('t1', 'new description')
    expect(result.id).toBe('t1')
  })
})
```

**Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL.

**Step 3: Implement `src/commands/update.ts`**

```ts
import { ClickUpClient, Task } from '../api.js'
import { Config } from '../config.js'

export async function updateDescription(config: Config, taskId: string, description: string): Promise<{ id: string; name: string }> {
  const client = new ClickUpClient(config)
  const task = await client.updateTaskDescription(taskId, description)
  return { id: task.id, name: task.name }
}
```

**Step 4: Run tests**

```bash
npm test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add update description command logic"
```

---

## Task 6: `cu create` Command

**Files:**
- Create: `src/commands/create.ts`
- Create: `src/commands/create.test.ts`

**Step 1: Write failing tests**

```ts
// src/commands/create.test.ts
import { describe, it, expect, vi } from 'vitest'

const mockCreate = vi.fn().mockResolvedValue({ id: 't_new', name: 'New task', url: 'http://cu/t_new' })

vi.mock('../api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    createTask: mockCreate
  }))
}))

describe('createTask', () => {
  it('creates a task with name and list', async () => {
    const { createTask } = await import('./create.js')
    const result = await createTask(
      { apiToken: 'pk_t', teamId: 'tm_1', lists: ['l1'] },
      { list: 'l1', name: 'New task' }
    )
    expect(mockCreate).toHaveBeenCalledWith('l1', { name: 'New task' })
    expect(result.id).toBe('t_new')
  })

  it('creates a task with parent initiative', async () => {
    const { createTask } = await import('./create.js')
    await createTask(
      { apiToken: 'pk_t', teamId: 'tm_1', lists: ['l1'] },
      { list: 'l1', name: 'Subtask', parent: 'initiative_1' }
    )
    expect(mockCreate).toHaveBeenCalledWith('l1', { name: 'Subtask', parent: 'initiative_1' })
  })
})
```

**Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL.

**Step 3: Implement `src/commands/create.ts`**

```ts
import { ClickUpClient } from '../api.js'
import { Config } from '../config.js'

export interface CreateOptions {
  list: string
  name: string
  description?: string
  parent?: string
  status?: string
}

export async function createTask(config: Config, options: CreateOptions): Promise<{ id: string; name: string; url: string }> {
  const client = new ClickUpClient(config)
  const { list, ...taskOptions } = options
  const task = await client.createTask(list, taskOptions)
  return { id: task.id, name: task.name, url: task.url }
}
```

**Step 4: Run tests**

```bash
npm test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add create task command logic"
```

---

## Task 7: CLI Entry Point (Commander.js wiring)

**Files:**
- Modify: `src/index.ts`
- Create: `src/index.test.ts`

**Step 1: Write failing integration smoke test**

```ts
// src/index.test.ts
import { describe, it, expect, vi } from 'vitest'
import { execSync } from 'child_process'

// Smoke test: CLI exits with non-zero and helpful message when no config
describe('CLI entry point', () => {
  it('shows help with --help', () => {
    // Build first
    execSync('npm run build', { cwd: process.cwd() })
    const output = execSync('node dist/index.js --help').toString()
    expect(output).toContain('tasks')
    expect(output).toContain('initiatives')
    expect(output).toContain('update')
    expect(output).toContain('create')
  })
})
```

**Step 2: Run to verify failure**

```bash
npm test -- src/index.test.ts
```

Expected: FAIL - commands not wired.

**Step 3: Implement `src/index.ts`**

```ts
import { Command } from 'commander'
import { loadConfig } from './config.js'
import { fetchMyTasks } from './commands/tasks.js'
import { updateDescription } from './commands/update.js'
import { createTask } from './commands/create.js'

const program = new Command()

program
  .name('cu')
  .description('ClickUp CLI for AI agents')
  .version('0.1.0')

program
  .command('tasks')
  .description('List tasks assigned to me')
  .action(async () => {
    try {
      const config = loadConfig()
      const tasks = await fetchMyTasks(config)
      console.log(JSON.stringify(tasks, null, 2))
    } catch (err) {
      console.error((err as Error).message)
      process.exit(1)
    }
  })

program
  .command('initiatives')
  .description('List initiatives assigned to me')
  .action(async () => {
    try {
      const config = loadConfig()
      const tasks = await fetchMyTasks(config, 'Initiative')
      console.log(JSON.stringify(tasks, null, 2))
    } catch (err) {
      console.error((err as Error).message)
      process.exit(1)
    }
  })

program
  .command('update <taskId>')
  .description('Update task description')
  .requiredOption('-d, --description <text>', 'New description (markdown supported)')
  .action(async (taskId: string, opts: { description: string }) => {
    try {
      const config = loadConfig()
      const result = await updateDescription(config, taskId, opts.description)
      console.log(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error((err as Error).message)
      process.exit(1)
    }
  })

program
  .command('create')
  .description('Create a new task')
  .requiredOption('-l, --list <listId>', 'Target list ID')
  .requiredOption('-n, --name <name>', 'Task name')
  .option('-d, --description <text>', 'Task description')
  .option('-p, --parent <taskId>', 'Parent initiative task ID')
  .option('-s, --status <status>', 'Initial status')
  .action(async (opts: { list: string; name: string; description?: string; parent?: string; status?: string }) => {
    try {
      const config = loadConfig()
      const result = await createTask(config, opts)
      console.log(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error((err as Error).message)
      process.exit(1)
    }
  })

program.parse()
```

**Step 4: Build and run smoke test**

```bash
npm run build && npm test -- src/index.test.ts
```

Expected: PASS - help output contains all commands.

**Step 5: Run all tests**

```bash
npm test
```

Expected: All tests PASS.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: wire CLI entry point with all commands"
```

---

## Task 8: Global Install + README

**Files:**
- Create: `README.md`

**Step 1: Link the CLI globally**

```bash
npm run build && npm link
```

Expected: `cu` command available globally. Verify:

```bash
which cu
cu --help
```

**Step 2: Write `README.md`**

```markdown
# cu - ClickUp CLI

Minimal ClickUp CLI for AI agents. JSON output, fast, no fluff.

## Install

\`\`\`bash
npm install
npm run build
npm link
\`\`\`

## Config

Create `~/.config/cu/config.json`:

\`\`\`json
{
  "apiToken": "pk_...",
  "teamId": "your_team_id",
  "lists": ["list_id_1", "list_id_2"]
}
\`\`\`

Get your teamId: `curl -H "Authorization: pk_..." https://api.clickup.com/api/v2/team`

## Commands

\`\`\`
cu tasks                          List tasks assigned to me (JSON)
cu initiatives                    List initiatives assigned to me (JSON)
cu update <taskId> -d "text"     Update task description
cu create -l <listId> -n "name"  Create task
cu create -l <listId> -n "name" -p <initiativeId>  Create task under initiative
\`\`\`

## Output format

All commands output JSON to stdout. Errors go to stderr with exit code 1.
\`\`\`
```

**Step 3: Commit**

```bash
git add -A && git commit -m "docs: add README and complete global install"
```

---

## Task 9: ClickUp Skill for AI Agents

**Files:**
- Create: `~/.config/opencode/skills/clickup/SKILL.md`

**Note:** This skill teaches AI agents how to use the `cu` CLI. It lives outside the project directory, in the user's global skills directory.

**Step 1: Check skills directory exists**

```bash
ls ~/.config/opencode/skills/
```

If directory does not exist:
```bash
mkdir -p ~/.config/opencode/skills/clickup
```

**Step 2: Write the skill**

```markdown
---
name: clickup-cli
description: Use when working with ClickUp tasks, initiatives, or need to read/write ClickUp data. Covers the `cu` CLI installed at ~/git/clickup-cli.
---

# ClickUp CLI (`cu`)

## Overview

`cu` is a CLI for interacting with ClickUp. JSON output to stdout, errors to stderr with non-zero exit.

Config at `~/.config/cu/config.json`:
- `apiToken` - ClickUp personal token (`pk_...`)
- `teamId` - ClickUp workspace/team ID
- `lists` - array of list IDs to search

## Commands

### Fetch tasks assigned to me
\`\`\`bash
cu tasks
\`\`\`
Returns JSON array of tasks from all configured lists.

### Fetch initiatives assigned to me
\`\`\`bash
cu initiatives
\`\`\`
Returns JSON array of Initiative-type tasks only.

### Update task description
\`\`\`bash
cu update <taskId> --description "markdown text here"
\`\`\`
Returns `{ id, name }` on success.

### Create a task
\`\`\`bash
cu create --list <listId> --name "Task name"
cu create --list <listId> --name "Task name" --description "desc" --parent <initiativeId>
\`\`\`
Returns `{ id, name, url }` on success.

## Output Format

All commands output JSON. Fields in task objects:
- `id` - task ID (use this for update/create --parent)
- `name` - task name
- `status` - current status string
- `task_type` - "task", "Initiative", etc.
- `list` - list name
- `url` - direct link to task
- `parent` - parent task ID (if subtask)

## Error Handling

Non-zero exit + message on stderr when:
- Config not found
- API error
- Missing required options
```

**Step 3: Verify skill file exists**

```bash
cat ~/.config/opencode/skills/clickup/SKILL.md
```

**Step 4: Commit project**

```bash
# In the clickup-cli project
git add -A && git commit -m "docs: finalize README"
```

---

## Final Verification

```bash
npm test
```

Expected: All tests pass.

```bash
cu --help
cu tasks
```

Expected: Help shown, tasks command runs (will fail if no real config, which is expected).
