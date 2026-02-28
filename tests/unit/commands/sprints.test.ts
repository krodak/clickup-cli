import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listSprints } from '../../../src/commands/sprints.js'
import { ClickUpClient } from '../../../src/api.js'

vi.mock('../../../src/output.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../../src/output.js')>('../../../src/output.js')
  return { ...actual, isTTY: vi.fn(() => false) }
})

const baseConfig = { apiToken: 'pk_test', teamId: 'team1' }

function mockSpaces(spaces: Array<{ id: string; name: string }>) {
  vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue(spaces)
}

describe('listSprints', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('returns sprint lists from sprint folders and filters non-sprint folders', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([
      {
        id: 't1',
        name: 'Task',
        status: { status: 'open', color: '#fff' },
        assignees: [],
        url: '',
        list: { id: 'l1', name: 'List' },
        space: { id: 's1' },
      },
    ])
    mockSpaces([{ id: 's1', name: 'Acme Engineering' }])
    vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([
      { id: 'f1', name: 'Acme Sprint' },
      { id: 'f2', name: 'Backlog' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolderLists').mockResolvedValue([
      { id: 'l1', name: 'Sprint 1 (1/1 - 1/14)' },
      { id: 'l2', name: 'Sprint 2 (1/15 - 1/28)' },
    ])

    await listSprints(baseConfig)

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string
    const parsed = JSON.parse(output) as Array<{ id: string; folder: string }>
    expect(parsed).toHaveLength(2)
    expect(parsed[0]!.folder).toBe('Acme Sprint')
    expect(parsed[1]!.folder).toBe('Acme Sprint')
  })

  it('JSON output includes all sprint info fields', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    mockSpaces([{ id: 's1', name: 'Acme' }])
    vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([
      { id: 'f1', name: 'Sprint Folder' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolderLists').mockResolvedValue([
      { id: 'l1', name: 'Sprint 1 (1/1 - 1/14)' },
    ])

    await listSprints(baseConfig, { space: 'Acme' })

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string
    const parsed = JSON.parse(output) as Array<Record<string, unknown>>
    expect(parsed).toHaveLength(1)
    const sprint = parsed[0]!
    expect(sprint).toHaveProperty('id', 'l1')
    expect(sprint).toHaveProperty('name', 'Sprint 1 (1/1 - 1/14)')
    expect(sprint).toHaveProperty('folder', 'Sprint Folder')
    expect(sprint).toHaveProperty('start')
    expect(sprint).toHaveProperty('end')
    expect(sprint).toHaveProperty('active')
    expect(sprint.start).not.toBeNull()
    expect(sprint.end).not.toBeNull()
  })

  it('marks at most one active sprint based on date range', async () => {
    const now = new Date()
    const m = now.getMonth() + 1
    const d = now.getDate()
    const activeSprintName = `Sprint Active (${m}/${d} - ${m}/${d})`

    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    mockSpaces([{ id: 's1', name: 'Acme' }])
    vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([
      { id: 'f1', name: 'Sprint Folder' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolderLists').mockResolvedValue([
      { id: 'l1', name: 'Sprint Old (1/1 - 1/2)' },
      { id: 'l2', name: activeSprintName },
      { id: 'l3', name: 'Sprint Future (12/30 - 12/31)' },
    ])

    await listSprints(baseConfig, { space: 'Acme' })

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string
    const parsed = JSON.parse(output) as Array<{ id: string; active: boolean }>
    const activeSprints = parsed.filter(s => s.active)
    expect(activeSprints).toHaveLength(1)
    expect(activeSprints[0]!.id).toBe('l2')
  })

  it('filters by space name', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    mockSpaces([
      { id: 's1', name: 'Acme' },
      { id: 's2', name: 'Platform' },
    ])
    const mockGetFolders = vi
      .spyOn(ClickUpClient.prototype, 'getFolders')
      .mockResolvedValue([{ id: 'f1', name: 'Sprint Folder' }])
    vi.spyOn(ClickUpClient.prototype, 'getFolderLists').mockResolvedValue([
      { id: 'l1', name: 'Sprint 1 (1/1 - 1/14)' },
    ])

    await listSprints(baseConfig, { space: 'Acm' })

    expect(mockGetFolders).toHaveBeenCalledWith('s1')
    expect(mockGetFolders).not.toHaveBeenCalledWith('s2')
  })

  it('throws when --space matches no spaces', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    mockSpaces([{ id: 's1', name: 'Acme' }])

    await expect(listSprints(baseConfig, { space: 'nonexistent' })).rejects.toThrow(
      'No space matching "nonexistent" found',
    )
  })

  it('outputs empty message when no sprints found in TTY mode', async () => {
    const { isTTY } = await import('../../../src/output.js')
    vi.mocked(isTTY).mockReturnValue(true)

    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    mockSpaces([{ id: 's1', name: 'Acme' }])
    vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([
      { id: 'f1', name: 'Sprint Folder' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolderLists').mockResolvedValue([])

    await listSprints(baseConfig, { space: 'Acme' })

    expect(console.log).toHaveBeenCalledWith('No sprints found.')
  })
})
