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

const mockConfirm = vi.fn()
vi.mock('@inquirer/prompts', () => ({ confirm: mockConfirm }))
const mockIsTTY = vi.fn()
vi.mock('../../../src/output.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/output.js')>()
  return { ...actual, isTTY: mockIsTTY }
})

describe('exportAll', () => {
  let out: string
  const logs: string[] = []
  const mockGetLists = vi.fn()
  const mockGetFolders = vi.fn()
  const mockGetFolderLists = vi.fn()
  const mockGetTasksFromList = vi.fn()
  const mockGetAllDocs = vi.fn()
  const mockGetDocPages = vi.fn()

  beforeEach(async () => {
    out = mkdtempSync(join(tmpdir(), 'cup-export-all-'))
    logs.length = 0
    ctorArgs.length = 0
    mockIsTTY.mockReset().mockReturnValue(false)
    mockConfirm.mockReset().mockResolvedValue(true)
    mockGetTeams.mockReset().mockResolvedValue([{ id: 'ws1', name: 'krodak' }])
    mockGetSpaces.mockReset().mockResolvedValue([
      { id: 'sp1', name: 'Alpha' },
      { id: 'sp2', name: 'Beta' },
    ])
    mockGetLists
      .mockReset()
      .mockImplementation(async (spaceId: string, archived: boolean) =>
        archived ? [] : [{ id: `${spaceId}-l1`, name: 'List' }],
      )
    mockGetFolders.mockReset().mockResolvedValue([])
    mockGetFolderLists.mockReset().mockResolvedValue([])
    mockGetTasksFromList
      .mockReset()
      .mockImplementation(async (listId: string, _p: unknown, o: { archived?: boolean }) =>
        o.archived ? [] : [task(`${listId}-t1`, { list: { id: listId, name: 'List' } })],
      )
    mockGetAllDocs.mockReset().mockResolvedValue([{ id: 'd1', name: 'Doc', workspace_id: 1 }])
    mockGetDocPages
      .mockReset()
      .mockResolvedValue([{ id: 'p1', doc_id: 'd1', name: 'P', content: 'x' }])
    mockGetTaskForExport.mockReset().mockImplementation(async (id: string) => task(id))
    mockGetAllTaskComments.mockReset().mockResolvedValue([])
    mockGetThreadedComments.mockReset().mockResolvedValue([])
    const { ClickUpClient } = await import('../../../src/api.js')
    ;(ClickUpClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        getMe: mockGetMe,
        getWorkspaceMembers: mockGetWorkspaceMembers,
        getMyTasks: mockGetMyTasks,
        getTeams: mockGetTeams,
        getSpaces: mockGetSpaces,
        getLists: mockGetLists,
        getFolders: mockGetFolders,
        getFolderLists: mockGetFolderLists,
        getTasksFromList: mockGetTasksFromList,
        getAllDocs: mockGetAllDocs,
        getDocPages: mockGetDocPages,
        getTaskForExport: mockGetTaskForExport,
        getAllTaskComments: mockGetAllTaskComments,
        getThreadedComments: mockGetThreadedComments,
      }
    })
  })

  afterEach(() => {
    rmSync(out, { recursive: true, force: true })
  })

  const base = () => ({
    out,
    refresh: false,
    attachments: true,
    dryRun: false,
    rpm: 90,
    log: (l: string) => logs.push(l),
  })

  it('non-TTY without --yes: prints the plan and refuses to run', async () => {
    const { exportAll } = await import('../../../src/commands/export.js')
    await expect(exportAll(config, { ...base(), yes: false })).rejects.toThrow(/--yes/)
    expect(logs.some(l => /2 spaces/.test(l) && /2 tasks/.test(l) && /1 docs/.test(l))).toBe(true)
    expect(mockGetTaskForExport).not.toHaveBeenCalled()
    expect(existsSync(join(out, 'tasks'))).toBe(false)
  })

  it('TTY: prompts, and a "no" cancels without fetching', async () => {
    mockIsTTY.mockReturnValue(true)
    mockConfirm.mockResolvedValue(false)
    const { exportAll } = await import('../../../src/commands/export.js')
    await expect(exportAll(config, { ...base(), yes: false })).rejects.toThrow(/Cancelled/)
    expect(mockConfirm).toHaveBeenCalledTimes(1)
    expect(mockGetTaskForExport).not.toHaveBeenCalled()
  })

  it('--yes: exports every space as a team slice plus docs, and summarises', async () => {
    const { exportAll } = await import('../../../src/commands/export.js')
    const summary = await exportAll(config, { ...base(), yes: true })

    expect(mockConfirm).not.toHaveBeenCalled()
    expect(summary.spaces).toEqual(['team-alpha', 'team-beta'])
    expect(summary.fetched).toBe(2)
    expect(summary.docs.docs).toBe(1)
    expect(existsSync(join(out, 'slices', 'team-alpha', 'README.md'))).toBe(true)
    expect(existsSync(join(out, 'slices', 'team-beta', 'README.md'))).toBe(true)
    expect(existsSync(join(out, 'docs', 'README.md'))).toBe(true)
    const root = readFileSync(join(out, 'README.md'), 'utf8')
    expect(root).toContain('team-alpha')
    expect(root).toContain('team-beta')
  })

  it('--dry-run prints the plan and stops, no confirmation needed', async () => {
    const { exportAll } = await import('../../../src/commands/export.js')
    const summary = await exportAll(config, { ...base(), dryRun: true, yes: false })
    expect(summary.dryRun).toBe(true)
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(mockGetTaskForExport).not.toHaveBeenCalled()
  })

  it('reports estimated requests and time in the plan', async () => {
    const { exportAll } = await import('../../../src/commands/export.js')
    await exportAll(config, { ...base(), dryRun: true, yes: false })
    expect(logs.some(l => /Estimated requests/.test(l))).toBe(true)
    expect(logs.some(l => /Estimated time/.test(l))).toBe(true)
  })
})
