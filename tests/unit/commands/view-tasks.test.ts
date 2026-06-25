import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetViewTasks = vi.fn()
const mockGetCustomTaskTypes = vi.fn().mockResolvedValue([])
const mockGetMe = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getViewTasks: mockGetViewTasks,
      getCustomTaskTypes: mockGetCustomTaskTypes,
      getMe: mockGetMe,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

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

describe('listViewTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomTaskTypes.mockResolvedValue([])
  })

  it('returns summarized tasks from the view', async () => {
    mockGetViewTasks.mockResolvedValue([
      baseTask({ id: 't1', name: 'First' }),
      baseTask({ id: 't2', name: 'Second' }),
    ])
    const { listViewTasks } = await import('../../../src/commands/view-tasks.js')
    const result = await listViewTasks(mockConfig, 'v1', {})
    expect(result.map(t => t.id)).toEqual(['t1', 't2'])
    expect(result[0]!.name).toBe('First')
    expect(mockGetViewTasks).toHaveBeenCalledWith('v1')
  })

  it('filters to the current user when me is set', async () => {
    mockGetMe.mockResolvedValue({ id: 99, username: 'me' })
    mockGetViewTasks.mockResolvedValue([
      baseTask({ id: 't1', assignees: [{ id: 99, username: 'me' }] }),
      baseTask({ id: 't2', assignees: [{ id: 1, username: 'other' }] }),
    ])
    const { listViewTasks } = await import('../../../src/commands/view-tasks.js')
    const result = await listViewTasks(mockConfig, 'v1', { me: true })
    expect(result.map(t => t.id)).toEqual(['t1'])
  })

  it('does not call getMe when me is not set', async () => {
    mockGetViewTasks.mockResolvedValue([baseTask()])
    const { listViewTasks } = await import('../../../src/commands/view-tasks.js')
    await listViewTasks(mockConfig, 'v1', {})
    expect(mockGetMe).not.toHaveBeenCalled()
  })

  it('returns an empty array for an empty view', async () => {
    mockGetViewTasks.mockResolvedValue([])
    const { listViewTasks } = await import('../../../src/commands/view-tasks.js')
    const result = await listViewTasks(mockConfig, 'v1', {})
    expect(result).toEqual([])
  })
})
