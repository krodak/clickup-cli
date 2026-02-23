import { describe, it, expect, vi } from 'vitest'

const mockCreate = vi.fn().mockResolvedValue({ id: 't_new', name: 'New task', url: 'http://cu/t_new' })

vi.mock('../api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    createTask: mockCreate
  }))
}))

describe('createTask', () => {
  it('creates a task with name and list', async () => {
    const { createTask } = await import('./create.js')
    const result = await createTask(
      { apiToken: 'pk_t', teamId: 'tm_1', lists: ['l1'] },
      { list: 'l1', name: 'New task' }
    )
    expect(mockCreate).toHaveBeenCalledWith('l1', { name: 'New task' })
    expect(result.id).toBe('t_new')
  })

  it('creates a task with parent initiative', async () => {
    const { createTask } = await import('./create.js')
    await createTask(
      { apiToken: 'pk_t', teamId: 'tm_1', lists: ['l1'] },
      { list: 'l1', name: 'Subtask', parent: 'initiative_1' }
    )
    expect(mockCreate).toHaveBeenCalledWith('l1', { name: 'Subtask', parent: 'initiative_1' })
  })
})
