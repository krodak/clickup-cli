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

describe('fetchOverdueTasks', () => {
  beforeEach(() => {
    mockGetMyTasks.mockReset()
    mockGetMe.mockReset().mockResolvedValue({ id: 42, username: 'me' })
  })

  it('returns tasks with due_date in the past', async () => {
    const pastDue = String(now - 24 * 60 * 60 * 1000)
    mockGetMyTasks.mockResolvedValue([makeTask('t1', 'to do', { due_date: pastDue })])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('t1')
  })

  it('excludes tasks with no due_date', async () => {
    mockGetMyTasks.mockResolvedValue([makeTask('t1', 'to do', { due_date: null })])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(0)
  })

  it('excludes tasks with future due_date', async () => {
    const futureDue = String(now + 24 * 60 * 60 * 1000)
    mockGetMyTasks.mockResolvedValue([makeTask('t1', 'to do', { due_date: futureDue })])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(0)
  })

  it('excludes tasks with done status', async () => {
    const pastDue = String(now - 1000)
    mockGetMyTasks.mockResolvedValue([makeTask('t1', 'done', { due_date: pastDue })])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(0)
  })

  it('excludes tasks with complete status', async () => {
    const pastDue = String(now - 1000)
    mockGetMyTasks.mockResolvedValue([makeTask('t1', 'complete', { due_date: pastDue })])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(0)
  })

  it('excludes tasks with closed status', async () => {
    const pastDue = String(now - 1000)
    mockGetMyTasks.mockResolvedValue([makeTask('t1', 'closed', { due_date: pastDue })])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(0)
  })

  it('excludes done/complete/closed case-insensitively', async () => {
    const pastDue = String(now - 1000)
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', 'Done', { due_date: pastDue }),
      makeTask('t2', 'COMPLETE', { due_date: pastDue }),
      makeTask('t3', 'Closed', { due_date: pastDue }),
      makeTask('t4', 'Completed', { due_date: pastDue }),
    ])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(0)
  })

  it('sorts by due_date ascending (most overdue first)', async () => {
    const oneDay = 24 * 60 * 60 * 1000
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', 'to do', { due_date: String(now - oneDay) }),
      makeTask('t2', 'to do', { due_date: String(now - 3 * oneDay) }),
      makeTask('t3', 'to do', { due_date: String(now - 2 * oneDay) }),
    ])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(3)
    expect(result.map(t => t.id)).toEqual(['t2', 't3', 't1'])
  })

  it('returns empty array when no tasks are overdue', async () => {
    mockGetMyTasks.mockResolvedValue([])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toEqual([])
  })

  it('returns TaskSummary objects with correct fields', async () => {
    const pastDue = String(now - 1000)
    mockGetMyTasks.mockResolvedValue([makeTask('t1', 'in progress', { due_date: pastDue })])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result[0]).toEqual({
      id: 't1',
      name: 'Task t1',
      status: 'in progress',
      task_type: 'task',
      list: 'L1',
      url: 'http://cu/t1',
    })
  })

  it('includes overdue tasks with non-closed statuses', async () => {
    const pastDue = String(now - 1000)
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', 'in progress', { due_date: pastDue }),
      makeTask('t2', 'to do', { due_date: pastDue }),
      makeTask('t3', 'in review', { due_date: pastDue }),
    ])
    const { fetchOverdueTasks } = await import('../../../src/commands/overdue.js')
    const result = await fetchOverdueTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(3)
  })
})
