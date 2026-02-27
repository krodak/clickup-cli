import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetMyTasks = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMyTasks: mockGetMyTasks,
  })),
}))

const mockIsTTY = vi.fn<() => boolean>()
const mockShouldOutputJson = vi.fn<(forceJson: boolean) => boolean>()

vi.mock('../../../src/output.js', async importOriginal => {
  const orig = await importOriginal<typeof import('../../../src/output.js')>()
  return {
    ...orig,
    isTTY: (...args: Parameters<typeof orig.isTTY>) => mockIsTTY(...args),
    shouldOutputJson: (...args: Parameters<typeof orig.shouldOutputJson>) =>
      mockShouldOutputJson(...args),
  }
})

const mockInteractiveTaskPicker = vi.fn()
const mockShowDetailsAndOpen = vi.fn()

vi.mock('../../../src/interactive.js', () => ({
  interactiveTaskPicker: (...args: unknown[]) => mockInteractiveTaskPicker(...args),
  showDetailsAndOpen: (...args: unknown[]) => mockShowDetailsAndOpen(...args),
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

describe('fetchMyTasks', () => {
  beforeEach(() => {
    mockGetMyTasks.mockReset()
  })

  it('returns all tasks when no type filter', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', custom_item_id: 0 }),
      baseTask({ id: 't2', custom_item_id: 1004 }),
    ])
    const { fetchMyTasks } = await import('../../../src/commands/tasks.js')
    const result = await fetchMyTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(2)
  })

  it('filters to initiatives when typeFilter is initiative', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', custom_item_id: 0 }),
      baseTask({ id: 't2', custom_item_id: 1004 }),
    ])
    const { fetchMyTasks } = await import('../../../src/commands/tasks.js')
    const result = await fetchMyTasks(
      { apiToken: 'pk_t', teamId: 'team1' },
      { typeFilter: 'initiative' },
    )
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('t2')
    expect(result[0]!.task_type).toBe('initiative')
  })

  it('filters to regular tasks when typeFilter is task', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', custom_item_id: 0 }),
      baseTask({ id: 't2', custom_item_id: 1004 }),
    ])
    const { fetchMyTasks } = await import('../../../src/commands/tasks.js')
    const result = await fetchMyTasks({ apiToken: 'pk_t', teamId: 'team1' }, { typeFilter: 'task' })
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('t1')
    expect(result[0]!.task_type).toBe('task')
  })

  it('passes status filter to API', async () => {
    mockGetMyTasks.mockResolvedValue([])
    const { fetchMyTasks } = await import('../../../src/commands/tasks.js')
    await fetchMyTasks({ apiToken: 'pk_t', teamId: 'team1' }, { statuses: ['in progress'] })
    expect(mockGetMyTasks).toHaveBeenCalledWith(
      'team1',
      expect.objectContaining({ statuses: ['in progress'] }),
    )
  })

  it('passes listIds filter to API', async () => {
    mockGetMyTasks.mockResolvedValue([])
    const { fetchMyTasks } = await import('../../../src/commands/tasks.js')
    await fetchMyTasks({ apiToken: 'pk_t', teamId: 'team1' }, { listIds: ['list_x'] })
    expect(mockGetMyTasks).toHaveBeenCalledWith(
      'team1',
      expect.objectContaining({ listIds: ['list_x'] }),
    )
  })

  it('calls getMyTasks with correct teamId', async () => {
    mockGetMyTasks.mockResolvedValue([])
    const { fetchMyTasks } = await import('../../../src/commands/tasks.js')
    await fetchMyTasks({ apiToken: 'pk_t', teamId: 'my_team' })
    expect(mockGetMyTasks).toHaveBeenCalledWith('my_team', expect.any(Object))
  })

  it('filters tasks by partial name (case-insensitive)', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug' }),
      baseTask({ id: 't2', name: 'Add search feature' }),
      baseTask({ id: 't3', name: 'Refactor LOGIN module' }),
    ])
    const { fetchMyTasks } = await import('../../../src/commands/tasks.js')
    const result = await fetchMyTasks({ apiToken: 'pk_t', teamId: 'team1' }, { name: 'login' })
    expect(result).toHaveLength(2)
    expect(result.map(t => t.id)).toEqual(['t1', 't3'])
  })

  it('returns all tasks when name filter is not provided', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug' }),
      baseTask({ id: 't2', name: 'Add search feature' }),
    ])
    const { fetchMyTasks } = await import('../../../src/commands/tasks.js')
    const result = await fetchMyTasks({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(2)
  })

  it('combines name filter with type filter', async () => {
    mockGetMyTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'Fix login bug', custom_item_id: 0 }),
      baseTask({ id: 't2', name: 'Login initiative', custom_item_id: 1004 }),
      baseTask({ id: 't3', name: 'Add search feature', custom_item_id: 0 }),
    ])
    const { fetchMyTasks } = await import('../../../src/commands/tasks.js')
    const result = await fetchMyTasks(
      { apiToken: 'pk_t', teamId: 'team1' },
      { typeFilter: 'task', name: 'login' },
    )
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('t1')
  })

  it('does not pass name filter to API call', async () => {
    mockGetMyTasks.mockResolvedValue([])
    const { fetchMyTasks } = await import('../../../src/commands/tasks.js')
    await fetchMyTasks({ apiToken: 'pk_t', teamId: 'team1' }, { name: 'test' })
    expect(mockGetMyTasks).toHaveBeenCalledWith('team1', {})
  })
})

describe('printTasks', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  const sampleTasks = [
    {
      id: 't1',
      name: 'Task One',
      status: 'open',
      task_type: 'task' as const,
      list: 'L1',
      url: 'http://cu/t1',
    },
  ]

  beforeEach(() => {
    mockIsTTY.mockReset()
    mockShouldOutputJson.mockReset()
    mockInteractiveTaskPicker.mockReset()
    mockShowDetailsAndOpen.mockReset()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    delete process.env['CU_OUTPUT']
  })

  it('outputs markdown when piped and forceJson is false', async () => {
    mockShouldOutputJson.mockReturnValue(false)
    mockIsTTY.mockReturnValue(false)
    const { printTasks } = await import('../../../src/commands/tasks.js')
    await printTasks(sampleTasks, false)
    expect(logSpy).toHaveBeenCalledOnce()
    const output = logSpy.mock.calls[0]![0] as string
    expect(output).toContain('|')
    expect(output).toContain('Task One')
    expect(output).not.toContain('"id"')
  })

  it('outputs JSON when forceJson is true', async () => {
    mockShouldOutputJson.mockReturnValue(true)
    mockIsTTY.mockReturnValue(false)
    const { printTasks } = await import('../../../src/commands/tasks.js')
    await printTasks(sampleTasks, true)
    expect(logSpy).toHaveBeenCalledOnce()
    const output = logSpy.mock.calls[0]![0] as string
    const parsed: unknown = JSON.parse(output)
    expect(parsed).toEqual(sampleTasks)
  })

  it('outputs JSON when CU_OUTPUT=json', async () => {
    mockShouldOutputJson.mockReturnValue(true)
    mockIsTTY.mockReturnValue(false)
    const { printTasks } = await import('../../../src/commands/tasks.js')
    await printTasks(sampleTasks, false)
    expect(logSpy).toHaveBeenCalledOnce()
    const output = logSpy.mock.calls[0]![0] as string
    const parsed: unknown = JSON.parse(output)
    expect(parsed).toBeTruthy()
  })
})
