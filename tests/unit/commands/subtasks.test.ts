import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetTask = vi.fn()
const mockGetTasksFromList = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getTask: mockGetTask,
    getTasksFromList: mockGetTasksFromList,
  })),
}))

const baseTask = (overrides = {}) => ({
  id: 'sub1',
  name: 'Subtask',
  custom_item_id: 0,
  status: { status: 'open', color: '' },
  url: 'http://cu/sub1',
  list: { id: 'l1', name: 'Roadmap' },
  assignees: [],
  parent: 'p1',
  ...overrides,
})

describe('fetchSubtasks', () => {
  beforeEach(() => {
    mockGetTask.mockReset()
    mockGetTasksFromList.mockReset()
  })

  it('fetches parent task to get list ID', async () => {
    mockGetTask.mockResolvedValue({
      id: 'p1',
      name: 'Parent',
      list: { id: 'l1', name: 'Roadmap' },
      status: { status: 'open', color: '' },
      assignees: [],
      url: '',
    })
    mockGetTasksFromList.mockResolvedValue([])
    const { fetchSubtasks } = await import('../../../src/commands/subtasks.js')
    await fetchSubtasks({ apiToken: 'pk_t', teamId: 'team1' }, 'p1')
    expect(mockGetTask).toHaveBeenCalledWith('p1')
  })

  it('queries list with parent filter', async () => {
    mockGetTask.mockResolvedValue({
      id: 'p1',
      name: 'Parent',
      list: { id: 'l1', name: 'Roadmap' },
      status: { status: 'open', color: '' },
      assignees: [],
      url: '',
    })
    mockGetTasksFromList.mockResolvedValue([])
    const { fetchSubtasks } = await import('../../../src/commands/subtasks.js')
    await fetchSubtasks({ apiToken: 'pk_t', teamId: 'team1' }, 'p1')
    expect(mockGetTasksFromList).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ parent: 'p1' }),
    )
  })

  it('returns mapped subtask summaries', async () => {
    mockGetTask.mockResolvedValue({
      id: 'p1',
      name: 'Parent',
      list: { id: 'l1', name: 'Roadmap' },
      status: { status: 'open', color: '' },
      assignees: [],
      url: '',
    })
    mockGetTasksFromList.mockResolvedValue([baseTask(), baseTask({ id: 'sub2', name: 'Sub 2' })])
    const { fetchSubtasks } = await import('../../../src/commands/subtasks.js')
    const result = await fetchSubtasks({ apiToken: 'pk_t', teamId: 'team1' }, 'p1')
    expect(result).toHaveLength(2)
    expect(result[0]!.id).toBe('sub1')
    expect(result[0]!.task_type).toBe('task')
  })
})
