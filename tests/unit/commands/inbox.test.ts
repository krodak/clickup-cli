import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InboxTaskSummary, TimePeriod, GroupedInbox } from '../../../src/commands/inbox.js'

const mockGetMyTasks = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMyTasks: mockGetMyTasks,
  })),
}))

const makeTask = (id: string, date_updated: number, overrides = {}) => ({
  id,
  name: `Task ${id}`,
  date_updated: String(date_updated),
  custom_item_id: 0,
  status: { status: 'open', color: '' },
  url: `http://cu/${id}`,
  list: { id: 'l1', name: 'L1' },
  assignees: [],
  ...overrides,
})

const DAY_MS = 86400 * 1000

describe('fetchInbox', () => {
  beforeEach(() => {
    mockGetMyTasks.mockReset()
  })

  it('filters out tasks older than the lookback period', async () => {
    const now = Date.now()
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', now - 1000),
      makeTask('t2', now - 3 * DAY_MS),
      makeTask('t3', now - 31 * DAY_MS),
    ])
    const { fetchInbox } = await import('../../../src/commands/inbox.js')
    const result = await fetchInbox({ apiToken: 'pk_t', teamId: 'team1' }, 30)
    expect(result).toHaveLength(2)
    expect(result.map(t => t.id)).not.toContain('t3')
  })

  it('respects custom days parameter', async () => {
    const now = Date.now()
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', now - 1000),
      makeTask('t2', now - 3 * DAY_MS),
      makeTask('t3', now - 8 * DAY_MS),
    ])
    const { fetchInbox } = await import('../../../src/commands/inbox.js')
    const result = await fetchInbox({ apiToken: 'pk_t', teamId: 'team1' }, 7)
    expect(result).toHaveLength(2)
    expect(result.map(t => t.id)).not.toContain('t3')
  })

  it('sorts by date_updated descending (most recent first)', async () => {
    const now = Date.now()
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', now - 5000),
      makeTask('t2', now - 1000),
      makeTask('t3', now - 3000),
    ])
    const { fetchInbox } = await import('../../../src/commands/inbox.js')
    const result = await fetchInbox({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result[0]!.id).toBe('t2')
    expect(result[1]!.id).toBe('t3')
    expect(result[2]!.id).toBe('t1')
  })

  it('returns empty array when no recent tasks', async () => {
    const now = Date.now()
    mockGetMyTasks.mockResolvedValue([makeTask('t1', now - 31 * DAY_MS)])
    const { fetchInbox } = await import('../../../src/commands/inbox.js')
    const result = await fetchInbox({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(0)
  })

  it('handles tasks with no date_updated (treated as 0 = old)', async () => {
    mockGetMyTasks.mockResolvedValue([{ ...makeTask('t1', 0), date_updated: undefined }])
    const { fetchInbox } = await import('../../../src/commands/inbox.js')
    const result = await fetchInbox({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(0)
  })

  it('includes date_updated in returned summaries', async () => {
    const now = Date.now()
    mockGetMyTasks.mockResolvedValue([makeTask('t1', now - 1000)])
    const { fetchInbox } = await import('../../../src/commands/inbox.js')
    const result = await fetchInbox({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result[0]!).toHaveProperty('date_updated')
    expect(result[0]!.date_updated).toBe(String(now - 1000))
  })
})

describe('classifyTimePeriod', () => {
  it('classifies a timestamp from today', async () => {
    const { classifyTimePeriod } = await import('../../../src/commands/inbox.js')
    const now = Date.now()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    expect(classifyTimePeriod(todayStart.getTime() + 1000, now)).toBe('today')
  })

  it('classifies a timestamp from yesterday', async () => {
    const { classifyTimePeriod } = await import('../../../src/commands/inbox.js')
    const now = Date.now()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const yesterdayNoon = todayStart.getTime() - 12 * 60 * 60 * 1000
    expect(classifyTimePeriod(yesterdayNoon, now)).toBe('yesterday')
  })

  it('classifies a timestamp from 3 days ago as last_7_days', async () => {
    const { classifyTimePeriod } = await import('../../../src/commands/inbox.js')
    const now = Date.now()
    expect(classifyTimePeriod(now - 3 * DAY_MS, now)).toBe('last_7_days')
  })

  it('classifies timestamps from earlier this month', async () => {
    const { classifyTimePeriod } = await import('../../../src/commands/inbox.js')
    const now = new Date(2025, 5, 20, 12, 0, 0).getTime()
    const earlyThisMonth = new Date(2025, 5, 5, 12, 0, 0).getTime()
    expect(classifyTimePeriod(earlyThisMonth, now)).toBe('earlier_this_month')
  })

  it('classifies timestamps from last month', async () => {
    const { classifyTimePeriod } = await import('../../../src/commands/inbox.js')
    const now = new Date(2025, 5, 20, 12, 0, 0).getTime()
    const lastMonth = new Date(2025, 4, 15, 12, 0, 0).getTime()
    expect(classifyTimePeriod(lastMonth, now)).toBe('last_month')
  })

  it('classifies very old timestamps as older', async () => {
    const { classifyTimePeriod } = await import('../../../src/commands/inbox.js')
    const now = new Date(2025, 5, 20, 12, 0, 0).getTime()
    const twoMonthsAgo = new Date(2025, 3, 10, 12, 0, 0).getTime()
    expect(classifyTimePeriod(twoMonthsAgo, now)).toBe('older')
  })
})

describe('groupTasks', () => {
  it('groups tasks into correct time periods', async () => {
    const { groupTasks } = await import('../../../src/commands/inbox.js')
    const now = Date.now()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const makeSummary = (id: string, dateUpdated: number): InboxTaskSummary => ({
      id,
      name: `Task ${id}`,
      status: 'open',
      task_type: 'task',
      list: 'L1',
      url: `http://cu/${id}`,
      date_updated: String(dateUpdated),
    })

    const tasks: InboxTaskSummary[] = [
      makeSummary('t1', todayStart.getTime() + 1000),
      makeSummary('t2', todayStart.getTime() - 12 * 60 * 60 * 1000),
      makeSummary('t3', now - 4 * DAY_MS),
    ]

    const groups: GroupedInbox = groupTasks(tasks, now)
    expect(groups.today).toHaveLength(1)
    expect(groups.today[0]!.id).toBe('t1')
    expect(groups.yesterday).toHaveLength(1)
    expect(groups.yesterday[0]!.id).toBe('t2')
    expect(groups.last_7_days).toHaveLength(1)
    expect(groups.last_7_days[0]!.id).toBe('t3')
  })

  it('returns empty arrays for periods with no tasks', async () => {
    const { groupTasks } = await import('../../../src/commands/inbox.js')
    const groups: GroupedInbox = groupTasks([], Date.now())
    const periods: TimePeriod[] = [
      'today',
      'yesterday',
      'last_7_days',
      'earlier_this_month',
      'last_month',
      'older',
    ]
    for (const period of periods) {
      expect(groups[period]).toHaveLength(0)
    }
  })
})
