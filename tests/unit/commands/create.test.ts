import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetTask = vi.fn()
const mockCreateTask = vi
  .fn()
  .mockResolvedValue({ id: 'new1', name: 'New Task', url: 'http://cu/new1' })

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    createTask: mockCreateTask,
    getTask: mockGetTask,
  })),
}))

describe('createTask', () => {
  beforeEach(() => {
    mockCreateTask.mockClear()
    mockGetTask.mockClear()
    mockCreateTask.mockResolvedValue({ id: 't_new', name: 'New task', url: 'http://cu/t_new' })
  })

  it('creates a task with name and list', async () => {
    const { createTask } = await import('../../../src/commands/create.js')
    const result = await createTask(
      { apiToken: 'pk_t', teamId: 'tm_1' },
      { list: 'l1', name: 'New task' },
    )
    expect(mockCreateTask).toHaveBeenCalledWith('l1', { name: 'New task' })
    expect(result.id).toBe('t_new')
  })

  it('creates a task with parent initiative', async () => {
    const { createTask } = await import('../../../src/commands/create.js')
    await createTask(
      { apiToken: 'pk_t', teamId: 'tm_1' },
      { list: 'l1', name: 'Subtask', parent: 'initiative_1' },
    )
    expect(mockCreateTask).toHaveBeenCalledWith('l1', { name: 'Subtask', parent: 'initiative_1' })
  })

  it('auto-detects list from parent task when --list omitted', async () => {
    mockGetTask.mockResolvedValue({
      id: 'p1',
      name: 'Parent',
      list: { id: 'auto_list', name: 'Roadmap' },
      status: { status: 'open', color: '' },
      assignees: [],
      url: '',
    })
    mockCreateTask.mockResolvedValue({ id: 'new_t', name: 'New task', url: 'http://cu/new_t' })

    const { createTask } = await import('../../../src/commands/create.js')
    const result = await createTask(
      { apiToken: 'pk_t', teamId: 'team1' },
      { name: 'New task', parent: 'p1' },
    )
    expect(mockGetTask).toHaveBeenCalledWith('p1')
    expect(mockCreateTask).toHaveBeenCalledWith(
      'auto_list',
      expect.objectContaining({ name: 'New task', parent: 'p1' }),
    )
    expect(result.id).toBe('new_t')
  })

  it('throws when both --list and --parent are omitted', async () => {
    const { createTask } = await import('../../../src/commands/create.js')
    await expect(
      createTask({ apiToken: 'pk_t', teamId: 'team1' }, { name: 'task' }),
    ).rejects.toThrow('--list or --parent')
  })
})
