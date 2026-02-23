import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetMyTasks = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMyTasks: mockGetMyTasks,
    getTask: vi.fn(),
  })),
}))

vi.mock('../../../src/interactive.js', () => ({
  groupedTaskPicker: vi.fn().mockResolvedValue([]),
  showDetailsAndOpen: vi.fn().mockResolvedValue(undefined),
}))

const makeTask = (id: string, status: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Task ${id}`,
  custom_item_id: 0,
  status: { status, color: '' },
  url: `http://cu/${id}`,
  list: { id: 'l1', name: 'L1' },
  assignees: [],
  priority: null,
  due_date: null,
  ...overrides,
})

describe('groupByStatus', () => {
  beforeEach(() => {
    mockGetMyTasks.mockReset()
  })

  it('groups tasks by their status', async () => {
    const { groupByStatus } = await import('../../../src/commands/assigned.js')
    const tasks = [
      makeTask('t1', 'in progress'),
      makeTask('t2', 'to do'),
      makeTask('t3', 'in progress'),
    ]
    const groups = groupByStatus(tasks as never[], false)
    expect(groups).toHaveLength(2)
    expect(groups[0]!.status).toBe('in progress')
    expect(groups[0]!.tasks).toHaveLength(2)
    expect(groups[1]!.status).toBe('to do')
    expect(groups[1]!.tasks).toHaveLength(1)
  })

  it('excludes closed statuses by default', async () => {
    const { groupByStatus } = await import('../../../src/commands/assigned.js')
    const tasks = [
      makeTask('t1', 'in progress'),
      makeTask('t2', 'done'),
      makeTask('t3', 'closed'),
      makeTask('t4', 'complete'),
    ]
    const groups = groupByStatus(tasks as never[], false)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.status).toBe('in progress')
  })

  it('includes closed statuses when includeClosed is true', async () => {
    const { groupByStatus } = await import('../../../src/commands/assigned.js')
    const tasks = [makeTask('t1', 'in progress'), makeTask('t2', 'done'), makeTask('t3', 'closed')]
    const groups = groupByStatus(tasks as never[], true)
    expect(groups).toHaveLength(3)
  })

  it('sorts closed statuses after active statuses', async () => {
    const { groupByStatus } = await import('../../../src/commands/assigned.js')
    const tasks = [
      makeTask('t1', 'done'),
      makeTask('t2', 'in progress'),
      makeTask('t3', 'closed'),
      makeTask('t4', 'to do'),
    ]
    const groups = groupByStatus(tasks as never[], true)
    const statuses = groups.map(g => g.status)
    expect(statuses.indexOf('in progress')).toBeLessThan(statuses.indexOf('done'))
    expect(statuses.indexOf('to do')).toBeLessThan(statuses.indexOf('closed'))
  })

  it('sorts active statuses by pipeline stage (later stages first)', async () => {
    const { groupByStatus } = await import('../../../src/commands/assigned.js')
    const tasks = [
      makeTask('t1', 'needs definition'),
      makeTask('t2', 'in progress'),
      makeTask('t3', 'to do'),
      makeTask('t4', 'code review'),
    ]
    const groups = groupByStatus(tasks as never[], false)
    expect(groups.map(g => g.status)).toEqual([
      'code review',
      'in progress',
      'to do',
      'needs definition',
    ])
  })

  it('puts unknown statuses after known ones but before closed', async () => {
    const { groupByStatus } = await import('../../../src/commands/assigned.js')
    const tasks = [
      makeTask('t1', 'custom status'),
      makeTask('t2', 'in progress'),
      makeTask('t3', 'done'),
    ]
    const groups = groupByStatus(tasks as never[], true)
    expect(groups.map(g => g.status)).toEqual(['in progress', 'custom status', 'done'])
  })

  it('returns empty array for no tasks', async () => {
    const { groupByStatus } = await import('../../../src/commands/assigned.js')
    const groups = groupByStatus([], false)
    expect(groups).toEqual([])
  })
})

describe('runAssignedCommand', () => {
  beforeEach(() => {
    mockGetMyTasks.mockReset()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('outputs JSON grouped by status when json option is set', async () => {
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', 'in progress', { priority: { priority: 'urgent' } }),
      makeTask('t2', 'to do'),
    ])
    const { runAssignedCommand } = await import('../../../src/commands/assigned.js')
    await runAssignedCommand({ apiToken: 'pk_t', teamId: 'team1' }, { json: true })

    const logged = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    const parsed = JSON.parse(logged) as Record<string, unknown[]>
    expect(parsed).toHaveProperty('in progress')
    expect(parsed).toHaveProperty('to do')
    expect(parsed['in progress']).toHaveLength(1)
    expect(parsed['to do']).toHaveLength(1)
  })

  it('excludes closed tasks from JSON output by default', async () => {
    mockGetMyTasks.mockResolvedValue([makeTask('t1', 'in progress'), makeTask('t2', 'done')])
    const { runAssignedCommand } = await import('../../../src/commands/assigned.js')
    await runAssignedCommand({ apiToken: 'pk_t', teamId: 'team1' }, { json: true })

    const logged = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    const parsed = JSON.parse(logged) as Record<string, unknown[]>
    expect(parsed).toHaveProperty('in progress')
    expect(parsed).not.toHaveProperty('done')
  })

  it('includes closed tasks in JSON output with includeClosed', async () => {
    mockGetMyTasks.mockResolvedValue([makeTask('t1', 'in progress'), makeTask('t2', 'done')])
    const { runAssignedCommand } = await import('../../../src/commands/assigned.js')
    await runAssignedCommand(
      { apiToken: 'pk_t', teamId: 'team1' },
      { json: true, includeClosed: true },
    )

    const logged = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    const parsed = JSON.parse(logged) as Record<string, unknown[]>
    expect(parsed).toHaveProperty('done')
  })

  it('prints no tasks message when empty', async () => {
    mockGetMyTasks.mockResolvedValue([])
    vi.stubGlobal('process', {
      ...process,
      stdout: { ...process.stdout, isTTY: true },
    })
    const { runAssignedCommand } = await import('../../../src/commands/assigned.js')
    await runAssignedCommand({ apiToken: 'pk_t', teamId: 'team1' }, {})

    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls
    const hasNoTasks = calls.some((c: unknown[]) => String(c[0]).includes('No tasks found'))
    expect(hasNoTasks).toBe(true)
  })
})
