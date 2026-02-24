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

  it('passes priority to API as numeric value', async () => {
    const { createTask } = await import('../../../src/commands/create.js')
    await createTask(
      { apiToken: 'pk_t', teamId: 'tm_1' },
      { list: 'l1', name: 'Task', priority: 'high' },
    )
    expect(mockCreateTask).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ name: 'Task', priority: 2 }),
    )
  })

  it('passes due date to API as unix timestamp', async () => {
    const { createTask } = await import('../../../src/commands/create.js')
    await createTask(
      { apiToken: 'pk_t', teamId: 'tm_1' },
      { list: 'l1', name: 'Task', dueDate: '2025-06-15' },
    )
    expect(mockCreateTask).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({
        name: 'Task',
        due_date: new Date('2025-06-15').getTime(),
        due_date_time: false,
      }),
    )
  })

  it('passes assignee to API as numeric array', async () => {
    const { createTask } = await import('../../../src/commands/create.js')
    await createTask(
      { apiToken: 'pk_t', teamId: 'tm_1' },
      { list: 'l1', name: 'Task', assignee: '12345' },
    )
    expect(mockCreateTask).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ name: 'Task', assignees: [12345] }),
    )
  })

  it('parses comma-separated tags', async () => {
    const { createTask } = await import('../../../src/commands/create.js')
    await createTask(
      { apiToken: 'pk_t', teamId: 'tm_1' },
      { list: 'l1', name: 'Task', tags: 'bug, frontend, urgent' },
    )
    expect(mockCreateTask).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ name: 'Task', tags: ['bug', 'frontend', 'urgent'] }),
    )
  })

  it('throws on non-numeric assignee', async () => {
    const { createTask } = await import('../../../src/commands/create.js')
    await expect(
      createTask(
        { apiToken: 'pk_t', teamId: 'tm_1' },
        { list: 'l1', name: 'Task', assignee: 'abc' },
      ),
    ).rejects.toThrow('numeric user ID')
  })
})
