import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateTask = vi.fn().mockResolvedValue({
  id: 't1',
  name: 'Task',
  status: { status: 'done', color: '' },
  list: { id: 'l1', name: 'L1' },
  assignees: [],
  url: '',
})

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    updateTask: mockUpdateTask,
  })),
}))

describe('updateTask', () => {
  beforeEach(() => {
    mockUpdateTask.mockClear()
  })

  it('calls API with task id and description', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    const result = await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {
      description: 'new desc',
    })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { description: 'new desc' })
    expect(result.id).toBe('t1')
  })

  it('calls API with status update', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { status: 'done' })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { status: 'done' })
  })

  it('calls API with name update', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { name: 'New name' })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { name: 'New name' })
  })

  it('calls API with multiple fields at once', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {
      name: 'New name',
      status: 'in progress',
    })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { name: 'New name', status: 'in progress' })
  })

  it('throws when no fields provided', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await expect(updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {})).rejects.toThrow(
      'at least one',
    )
  })

  it('throws when description is empty string', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await expect(
      updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { description: '' }),
    ).rejects.toThrow('at least one')
  })
})

describe('updateDescription (backward compat)', () => {
  it('delegates to updateTask with description', async () => {
    const { updateDescription } = await import('../../../src/commands/update.js')
    await updateDescription({ apiToken: 'pk_t', teamId: 'team1' }, 't1', 'new description')
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { description: 'new description' })
  })

  it('throws when description is only whitespace', async () => {
    const { updateDescription } = await import('../../../src/commands/update.js')
    await expect(
      updateDescription({ apiToken: 'pk_t', teamId: 'team1' }, 't1', '   '),
    ).rejects.toThrow('at least one')
  })
})
