import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Task } from '../../../src/api.js'

const mockGetMyTasks = vi.fn()
const mockGetMe = vi.fn().mockResolvedValue({ id: 42, username: 'me' })

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMyTasks: mockGetMyTasks,
    getMe: mockGetMe,
  })),
}))

vi.mock('../../../src/output.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../../src/output.js')>('../../../src/output.js')
  return {
    ...actual,
    isTTY: vi.fn().mockReturnValue(false),
  }
})

const now = Date.now()

const makeTask = (id: string, status: string, overrides: Partial<Task> = {}): Task =>
  ({
    id,
    name: `Task ${id}`,
    custom_item_id: 0,
    status: { status, color: '' },
    url: `http://cu/${id}`,
    list: { id: 'l1', name: 'L1' },
    assignees: [],
    priority: null,
    due_date: null,
    date_updated: String(now),
    date_created: String(now),
    ...overrides,
  }) as Task

describe('categorizeTasks', () => {
  beforeEach(() => {
    mockGetMyTasks.mockReset()
    mockGetMe.mockReset().mockResolvedValue({ id: 42, username: 'me' })
  })

  it('puts recently completed tasks in completed bucket', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const tasks = [makeTask('t1', 'done', { date_updated: String(now - 1000) })]
    const result = categorizeTasks(tasks, 24)
    expect(result.completed).toHaveLength(1)
    expect(result.completed[0]!.id).toBe('t1')
    expect(result.inProgress).toHaveLength(0)
    expect(result.overdue).toHaveLength(0)
  })

  it('excludes completed tasks older than the lookback window', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const old = now - 25 * 60 * 60 * 1000
    const tasks = [makeTask('t1', 'done', { date_updated: String(old) })]
    const result = categorizeTasks(tasks, 24)
    expect(result.completed).toHaveLength(0)
  })

  it('matches completed status patterns case-insensitively', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const tasks = [
      makeTask('t1', 'Done', { date_updated: String(now) }),
      makeTask('t2', 'COMPLETE', { date_updated: String(now) }),
      makeTask('t3', 'Closed', { date_updated: String(now) }),
      makeTask('t4', 'Completed', { date_updated: String(now) }),
    ]
    const result = categorizeTasks(tasks, 24)
    expect(result.completed).toHaveLength(4)
  })

  it('puts in-progress tasks in the inProgress bucket', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const tasks = [
      makeTask('t1', 'in progress'),
      makeTask('t2', 'in review'),
      makeTask('t3', 'doing'),
      makeTask('t4', 'code review'),
    ]
    const result = categorizeTasks(tasks, 24)
    expect(result.inProgress).toHaveLength(4)
  })

  it('matches in-progress status patterns case-insensitively', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const tasks = [
      makeTask('t1', 'In Progress'),
      makeTask('t2', 'IN REVIEW'),
      makeTask('t3', 'Doing'),
    ]
    const result = categorizeTasks(tasks, 24)
    expect(result.inProgress).toHaveLength(3)
  })

  it('puts overdue tasks in the overdue bucket', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const pastDue = String(now - 24 * 60 * 60 * 1000)
    const tasks = [makeTask('t1', 'to do', { due_date: pastDue })]
    const result = categorizeTasks(tasks, 24)
    expect(result.overdue).toHaveLength(1)
    expect(result.overdue[0]!.id).toBe('t1')
  })

  it('does not mark tasks with future due date as overdue', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const futureDue = String(now + 24 * 60 * 60 * 1000)
    const tasks = [makeTask('t1', 'to do', { due_date: futureDue })]
    const result = categorizeTasks(tasks, 24)
    expect(result.overdue).toHaveLength(0)
  })

  it('does not mark tasks with no due date as overdue', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const tasks = [makeTask('t1', 'to do', { due_date: null })]
    const result = categorizeTasks(tasks, 24)
    expect(result.overdue).toHaveLength(0)
  })

  it('a task can appear in both inProgress and overdue', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const pastDue = String(now - 1000)
    const tasks = [makeTask('t1', 'in progress', { due_date: pastDue })]
    const result = categorizeTasks(tasks, 24)
    expect(result.inProgress).toHaveLength(1)
    expect(result.overdue).toHaveLength(1)
  })

  it('respects custom hours lookback', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const twoHoursAgo = now - 2 * 60 * 60 * 1000
    const tasks = [makeTask('t1', 'done', { date_updated: String(twoHoursAgo) })]

    const within = categorizeTasks(tasks, 3)
    expect(within.completed).toHaveLength(1)

    const outside = categorizeTasks(tasks, 1)
    expect(outside.completed).toHaveLength(0)
  })

  it('returns empty buckets when no tasks match', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const result = categorizeTasks([], 24)
    expect(result.completed).toEqual([])
    expect(result.inProgress).toEqual([])
    expect(result.overdue).toEqual([])
  })

  it('handles tasks with status containing partial matches', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const tasks = [
      makeTask('t1', 'almost done', { date_updated: String(now) }),
      makeTask('t2', 'currently doing stuff'),
    ]
    const result = categorizeTasks(tasks, 24)
    expect(result.completed).toHaveLength(1)
    expect(result.inProgress).toHaveLength(1)
  })

  it('does not put non-in-progress task with no due_date in overdue', async () => {
    const { categorizeTasks } = await import('../../../src/commands/summary.js')
    const tasks = [makeTask('t1', 'backlog')]
    const result = categorizeTasks(tasks, 24)
    expect(result.completed).toHaveLength(0)
    expect(result.inProgress).toHaveLength(0)
    expect(result.overdue).toHaveLength(0)
  })
})

describe('runSummaryCommand', () => {
  beforeEach(() => {
    mockGetMyTasks.mockReset()
    mockGetMe.mockReset().mockResolvedValue({ id: 42, username: 'me' })
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('outputs JSON with correct structure', async () => {
    const pastDue = String(now - 1000)
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', 'done', { date_updated: String(now) }),
      makeTask('t2', 'in progress', { due_date: pastDue }),
      makeTask('t3', 'to do'),
    ])
    const { runSummaryCommand } = await import('../../../src/commands/summary.js')
    await runSummaryCommand({ apiToken: 'pk_t', teamId: 'team1' }, { hours: 24, json: true })

    const logged = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    const parsed = JSON.parse(logged) as Record<string, unknown[]>
    expect(parsed).toHaveProperty('completed')
    expect(parsed).toHaveProperty('inProgress')
    expect(parsed).toHaveProperty('overdue')
    expect(parsed.completed).toHaveLength(1)
    expect(parsed.inProgress).toHaveLength(1)
    expect(parsed.overdue).toHaveLength(1)
  })

  it('outputs empty buckets when no tasks', async () => {
    mockGetMyTasks.mockResolvedValue([])
    const { runSummaryCommand } = await import('../../../src/commands/summary.js')
    await runSummaryCommand({ apiToken: 'pk_t', teamId: 'team1' }, { hours: 24, json: true })

    const logged = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    const parsed = JSON.parse(logged) as Record<string, unknown[]>
    expect(parsed.completed).toEqual([])
    expect(parsed.inProgress).toEqual([])
    expect(parsed.overdue).toEqual([])
  })

  it('uses provided hours parameter', async () => {
    const threeHoursAgo = now - 3 * 60 * 60 * 1000
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', 'done', { date_updated: String(threeHoursAgo) }),
    ])
    const { runSummaryCommand } = await import('../../../src/commands/summary.js')
    await runSummaryCommand({ apiToken: 'pk_t', teamId: 'team1' }, { hours: 2, json: true })

    const logged = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    const parsed = JSON.parse(logged) as Record<string, unknown[]>
    expect(parsed.completed).toHaveLength(0)
  })

  it('outputs markdown when piped (non-TTY, no --json)', async () => {
    const pastDue = String(now - 1000)
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', 'done', { date_updated: String(now) }),
      makeTask('t2', 'in progress', { due_date: pastDue }),
    ])

    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(false)

    const { runSummaryCommand } = await import('../../../src/commands/summary.js')
    await runSummaryCommand({ apiToken: 'pk_t', teamId: 'team1' }, { hours: 24, json: false })

    const logged = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    expect(logged).toContain('## Completed Recently')
    expect(logged).toContain('## In Progress')
    expect(logged).toContain('| ID |')
    expect(() => JSON.parse(logged) as unknown).toThrow()
  })

  it('outputs "No tasks found." in markdown when all buckets empty and piped', async () => {
    mockGetMyTasks.mockResolvedValue([])

    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(false)

    const { runSummaryCommand } = await import('../../../src/commands/summary.js')
    await runSummaryCommand({ apiToken: 'pk_t', teamId: 'team1' }, { hours: 24, json: false })

    const logged = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    expect(logged).toBe('No tasks found.')
  })

  it('outputs TTY format with section headers', async () => {
    mockGetMyTasks.mockResolvedValue([makeTask('t1', 'in progress')])

    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const { runSummaryCommand } = await import('../../../src/commands/summary.js')
    await runSummaryCommand({ apiToken: 'pk_t', teamId: 'team1' }, { hours: 24, json: false })

    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls
    const allOutput = calls.map((c: unknown[]) => String(c[0])).join('\n')
    expect(allOutput).toContain('Completed Recently')
    expect(allOutput).toContain('In Progress')
    expect(allOutput).toContain('Overdue')
  })
})
