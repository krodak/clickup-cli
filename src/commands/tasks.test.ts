import { describe, it, expect, vi } from 'vitest'

const mockGetMyTasksFromList = vi.fn().mockResolvedValue([
  { id: 't1', name: 'Regular task', task_type: 'task', status: { status: 'open' }, url: 'http://cu/t1', list: { id: 'l1', name: 'L1' }, assignees: [] },
  { id: 't2', name: 'Initiative task', task_type: 'Initiative', status: { status: 'open' }, url: 'http://cu/t2', list: { id: 'l1', name: 'L1' }, assignees: [] }
])

vi.mock('../api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMyTasksFromList: mockGetMyTasksFromList
  }))
}))

describe('fetchMyTasks', () => {
  it('returns all tasks when no type filter', async () => {
    const { fetchMyTasks } = await import('./tasks.js')
    const result = await fetchMyTasks({ apiToken: 'pk_t', lists: ['l1'] })
    expect(result).toHaveLength(2)
  })

  it('filters by task_type when provided', async () => {
    const { fetchMyTasks } = await import('./tasks.js')
    const result = await fetchMyTasks({ apiToken: 'pk_t', lists: ['l1'] }, 'Initiative')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t2')
  })

  it('fetches all configured lists in parallel', async () => {
    mockGetMyTasksFromList.mockClear()
    const { fetchMyTasks } = await import('./tasks.js')
    await fetchMyTasks({ apiToken: 'pk_t', lists: ['l1', 'l2', 'l3'] })
    expect(mockGetMyTasksFromList).toHaveBeenCalledTimes(3)
    expect(mockGetMyTasksFromList).toHaveBeenCalledWith('l1')
    expect(mockGetMyTasksFromList).toHaveBeenCalledWith('l2')
    expect(mockGetMyTasksFromList).toHaveBeenCalledWith('l3')
  })
})
