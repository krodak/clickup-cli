import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMyTasksFromList: vi.fn().mockResolvedValue([
      { id: 't1', name: 'Regular task', task_type: 'task', status: { status: 'open' }, url: 'http://cu/t1', list: { id: 'l1', name: 'L1' }, assignees: [] },
      { id: 't2', name: 'Initiative task', task_type: 'Initiative', status: { status: 'open' }, url: 'http://cu/t2', list: { id: 'l1', name: 'L1' }, assignees: [] }
    ])
  }))
}))

describe('fetchMyTasks', () => {
  it('returns all tasks when no type filter', async () => {
    const { fetchMyTasks } = await import('./tasks.js')
    const result = await fetchMyTasks({ apiToken: 'pk_t', teamId: 'tm_1', lists: ['l1'] })
    expect(result).toHaveLength(2)
  })

  it('filters by task_type when provided', async () => {
    const { fetchMyTasks } = await import('./tasks.js')
    const result = await fetchMyTasks({ apiToken: 'pk_t', teamId: 'tm_1', lists: ['l1'] }, 'Initiative')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t2')
  })
})
