import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetMyTasks = vi.fn()
const mockGetCustomTaskTypes = vi.fn().mockResolvedValue([])
const mockGetSpaces = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getMyTasks: mockGetMyTasks,
      getCustomTaskTypes: mockGetCustomTaskTypes,
      getSpaces: mockGetSpaces,
    }
  }),
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

  it('returns all tasks when query is undefined', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug' }),
      baseTask({ id: 't2', name: 'Add search feature' }),
    ])
    const { searchTasks } = await import('../../../src/commands/search.js')
    const result = await searchTasks(config, undefined)
    expect(result).toHaveLength(2)
  })

  it('returns all tasks when query is empty string', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug' }),
      baseTask({ id: 't2', name: 'Add search feature' }),
    ])
    const { searchTasks } = await import('../../../src/commands/search.js')
    const result = await searchTasks(config, '')
    expect(result).toHaveLength(2)
  })

  it('still filters by status when query is absent', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug', status: { status: 'in progress', color: '' } }),
      baseTask({ id: 't2', name: 'Add search feature', status: { status: 'open', color: '' } }),
    ])
    const { searchTasks } = await import('../../../src/commands/search.js')
    const result = await searchTasks(config, undefined, { status: 'in progress' })
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('t1')
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
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 't1',
        name: 'Fix login bug',
        status: 'open',
        task_type: 'task',
        priority: 'none',
        list: 'L1',
        url: 'http://cu/t1',
      }),
    )
  })
})

describe('resolveSpaceNameToId', () => {
  beforeEach(() => {
    mockGetSpaces.mockReset()
  })

  it('passes numeric space ID through unchanged', async () => {
    const { resolveSpaceNameToId } = await import('../../../src/commands/search.js')
    const result = await resolveSpaceNameToId(config, '12345')
    expect(result).toBe('12345')
    expect(mockGetSpaces).not.toHaveBeenCalled()
  })

  it('resolves space name to ID via fuzzy match', async () => {
    mockGetSpaces.mockResolvedValue([
      { id: 's1', name: 'Kayenta Team' },
      { id: 's2', name: 'Platform' },
    ])
    const { resolveSpaceNameToId } = await import('../../../src/commands/search.js')
    const result = await resolveSpaceNameToId(config, 'kayenta')
    expect(result).toBe('s1')
  })

  it('throws helpful error when space name matches multiple spaces', async () => {
    mockGetSpaces.mockResolvedValue([
      { id: 's1', name: 'Engineering Alpha' },
      { id: 's2', name: 'Engineering Beta' },
      { id: 's3', name: 'Platform' },
    ])
    const { resolveSpaceNameToId } = await import('../../../src/commands/search.js')
    await expect(resolveSpaceNameToId(config, 'engineering')).rejects.toThrow(
      'Multiple spaces match "engineering"',
    )
  })

  it('throws helpful error when space name matches no spaces', async () => {
    mockGetSpaces.mockResolvedValue([
      { id: 's1', name: 'Kayenta Team' },
      { id: 's2', name: 'Platform' },
    ])
    const { resolveSpaceNameToId } = await import('../../../src/commands/search.js')
    await expect(resolveSpaceNameToId(config, 'nonexistent')).rejects.toThrow(
      'No space matching "nonexistent" found',
    )
  })
})
