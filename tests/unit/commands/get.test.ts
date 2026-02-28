import { describe, it, expect, vi } from 'vitest'

const mockTask = {
  id: 't1',
  name: 'My Task',
  description: 'Some description',
  status: { status: 'in progress', color: '#blue' },
  task_type: 'task',
  assignees: [{ id: 42, username: 'me' }],
  url: 'https://app.clickup.com/t/t1',
  list: { id: 'l1', name: 'Sprint 1' },
  parent: undefined,
}

const mockGetTask = vi.fn().mockResolvedValue(mockTask)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getTask: mockGetTask,
  })),
}))

describe('getTask', () => {
  it('returns full task details', async () => {
    const { getTask } = await import('../../../src/commands/get.js')
    const result = await getTask({ apiToken: 'pk_t', teamId: 'team_1' }, 't1')
    expect(mockGetTask).toHaveBeenCalledWith('t1')
    expect(result.id).toBe('t1')
    expect(result.name).toBe('My Task')
    expect(result.description).toBe('Some description')
  })

  it('passes the task id to the API', async () => {
    const { getTask } = await import('../../../src/commands/get.js')
    await getTask({ apiToken: 'pk_t', teamId: 'team_1' }, 'abc123')
    expect(mockGetTask).toHaveBeenCalledWith('abc123')
  })

  it('returns custom_fields when present', async () => {
    const taskWithFields = {
      ...mockTask,
      custom_fields: [
        {
          id: 'cf1',
          name: 'Sprint',
          type: 'drop_down',
          value: 1,
          type_config: { options: [{ id: 1, name: 'Sprint 5' }] },
        },
      ],
    }
    mockGetTask.mockResolvedValueOnce(taskWithFields)
    const { getTask } = await import('../../../src/commands/get.js')
    const result = await getTask({ apiToken: 'pk_t', teamId: 'team_1' }, 't1')
    expect(result.custom_fields).toHaveLength(1)
    expect(result.custom_fields![0]!.name).toBe('Sprint')
  })
})
