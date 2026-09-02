import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetMe = vi.fn()
const mockGetWorkspaceMembers = vi.fn()
const mockGetMyTasks = vi.fn()
const mockGetTeams = vi.fn()
const mockGetSpaces = vi.fn()
const mockGetTaskForExport = vi.fn()
const mockGetAllTaskComments = vi.fn()
const mockGetThreadedComments = vi.fn()
const ctorArgs: unknown[] = []

vi.mock('../../../src/api.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/api.js')>()
  return {
    ...actual,
    ClickUpClient: vi.fn().mockImplementation(function (cfg: unknown) {
      ctorArgs.push(cfg)
      return {
        getMe: mockGetMe,
        getWorkspaceMembers: mockGetWorkspaceMembers,
        getMyTasks: mockGetMyTasks,
        getTeams: mockGetTeams,
        getSpaces: mockGetSpaces,
        getTaskForExport: mockGetTaskForExport,
        getAllTaskComments: mockGetAllTaskComments,
        getThreadedComments: mockGetThreadedComments,
      }
    }),
  }
})

const config = { apiToken: 'pk_test', teamId: 'ws1' }

function task(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    name: `Task ${id}`,
    status: { status: 'to do', color: '#000' },
    assignees: [{ id: 1, username: 'chris' }],
    url: `https://app.clickup.com/t/${id}`,
    list: { id: 'l1', name: 'Roadmap' },
    space: { id: 'sp1' },
    ...extra,
  }
}

describe('exportUser', () => {
  let out: string
  const logs: string[] = []

  beforeEach(() => {
    out = mkdtempSync(join(tmpdir(), 'cup-export-user-'))
    logs.length = 0
    ctorArgs.length = 0
    mockGetMe.mockReset().mockResolvedValue({ id: 1, username: 'chris' })
    mockGetWorkspaceMembers.mockReset().mockResolvedValue([])
    mockGetTeams.mockReset().mockResolvedValue([{ id: 'ws1', name: 'krodak' }])
    mockGetSpaces.mockReset().mockResolvedValue([{ id: 'sp1', name: 'Kayenta' }])
    mockGetMyTasks
      .mockReset()
      .mockImplementation(async (_team: string, f: { archived?: boolean }) =>
        f.archived ? [] : [task('t1'), task('t2')],
      )
    mockGetTaskForExport.mockReset().mockImplementation(async (id: string) => task(id))
    mockGetAllTaskComments.mockReset().mockResolvedValue([])
    mockGetThreadedComments.mockReset().mockResolvedValue([])
  })

  afterEach(() => {
    rmSync(out, { recursive: true, force: true })
  })

  it('exports assigned tasks, writes the user index and root README', async () => {
    const { exportUser } = await import('../../../src/commands/export.js')
    const summary = await exportUser(config, 'me', {
      out,
      refresh: false,
      attachments: true,
      dryRun: false,
      rpm: 90,
      log: l => logs.push(l),
    })

    expect(summary.slice).toBe('user-chris')
    expect(summary.planned).toBe(2)
    expect(summary.fetched).toBe(2)
    expect(existsSync(join(out, 'tasks', 't1', 'task.md'))).toBe(true)
    const index = readFileSync(join(out, 'slices', 'user-chris', 'README.md'), 'utf8')
    expect(index).toContain('# chris — tasks')
    expect(index).toContain('[Task t1](../../tasks/t1/task.md)')
    expect(index).toContain('Kayenta / Roadmap: 2')
    const root = readFileSync(join(out, 'README.md'), 'utf8')
    expect(root).toContain('user-chris')
    expect(root).toContain('[user-chris](slices/user-chris/README.md)')
  })

  it('configures the client with a rate limiter at the requested rpm', async () => {
    const { exportUser } = await import('../../../src/commands/export.js')
    await exportUser(config, 'me', {
      out,
      refresh: false,
      attachments: false,
      dryRun: true,
      rpm: 42,
      log: () => {},
    })
    const cfg = ctorArgs[0] as { rateLimiter?: unknown }
    expect(cfg.rateLimiter).toBeDefined()
  })

  it('dry-run discovers and reports the plan without fetching or writing', async () => {
    const { exportUser } = await import('../../../src/commands/export.js')
    const summary = await exportUser(config, 'me', {
      out,
      refresh: false,
      attachments: true,
      dryRun: true,
      rpm: 90,
      log: l => logs.push(l),
    })
    expect(summary.planned).toBe(2)
    expect(summary.fetched).toBe(0)
    expect(mockGetTaskForExport).not.toHaveBeenCalled()
    expect(existsSync(join(out, 'tasks'))).toBe(false)
    expect(logs.some(l => /2 tasks/.test(l))).toBe(true)
  })

  it('fails clearly without a teamId', async () => {
    const { exportUser } = await import('../../../src/commands/export.js')
    await expect(
      exportUser({ apiToken: 'pk', teamId: '' }, 'me', {
        out,
        refresh: false,
        attachments: true,
        dryRun: false,
        rpm: 90,
        log: () => {},
      }),
    ).rejects.toThrow(/teamId/)
  })
})
