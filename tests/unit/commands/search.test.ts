import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetMyTasks = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMyTasks: mockGetMyTasks,
  })),
}))

const baseTask = (overrides: object = {}) => ({
  id: 't1',
  name: 'Task',
  custom_item_id: 0,
  status: { status: 'open', color: '' },
  url: 'http://cu/t1',
  list: { id: 'l1', name: 'L1' },
  assignees: [],
  ...overrides,
})

const config = { apiToken: 'pk_test', teamId: 'team1' }

describe('searchTasks', () => {
  beforeEach(() => {
    mockGetMyTasks.mockReset()
  })

  it('throws on empty query', async () => {
    const { searchTasks } = await import('../../../src/commands/search.js')
    await expect(searchTasks(config, '')).rejects.toThrow('Search query cannot be empty')
    await expect(searchTasks(config, '   ')).rejects.toThrow('Search query cannot be empty')
  })

  it('matches tasks by name (case-insensitive)', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug' }),
      baseTask({ id: 't2', name: 'Add search feature' }),
      baseTask({ id: 't3', name: 'Refactor LOGIN module' }),
    ])
    const { searchTasks } = await import('../../../src/commands/search.js')
    const result = await searchTasks(config, 'login')
    expect(result).toHaveLength(2)
    expect(result.map(t => t.id)).toEqual(['t1', 't3'])
  })

  it('returns empty array when no tasks match', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug' }),
      baseTask({ id: 't2', name: 'Add search feature' }),
    ])
    const { searchTasks } = await import('../../../src/commands/search.js')
    const result = await searchTasks(config, 'nonexistent')
    expect(result).toHaveLength(0)
  })

  it('matches all words in multi-word query', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug' }),
      baseTask({ id: 't2', name: 'Login page redesign' }),
      baseTask({ id: 't3', name: 'Fix payment bug' }),
    ])
    const { searchTasks } = await import('../../../src/commands/search.js')
    const result = await searchTasks(config, 'fix bug')
    expect(result).toHaveLength(2)
    expect(result.map(t => t.id)).toEqual(['t1', 't3'])
  })

  it('filters by status', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug', status: { status: 'in progress', color: '' } }),
      baseTask({ id: 't2', name: 'Fix login form', status: { status: 'open', color: '' } }),
    ])
    const { searchTasks } = await import('../../../src/commands/search.js')
    const result = await searchTasks(config, 'login', { status: 'in progress' })
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('t1')
    expect(result[0]!.status).toBe('in progress')
  })

  it('filters by status with fuzzy matching', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug', status: { status: 'in progress', color: '' } }),
      baseTask({ id: 't2', name: 'Fix login form', status: { status: 'open', color: '' } }),
    ])
    const { searchTasks } = await import('../../../src/commands/search.js')
    const result = await searchTasks(config, 'login', { status: 'prog' })
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('t1')
  })

  it('returns TaskSummary objects', async () => {
    mockGetMyTasks.mockResolvedValue([baseTask({ id: 't1', name: 'Fix login bug' })])
    const { searchTasks } = await import('../../../src/commands/search.js')
    const result = await searchTasks(config, 'login')
    expect(result[0]).toEqual({
      id: 't1',
      name: 'Fix login bug',
      status: 'open',
      task_type: 'task',
      list: 'L1',
      url: 'http://cu/t1',
    })
  })
})
