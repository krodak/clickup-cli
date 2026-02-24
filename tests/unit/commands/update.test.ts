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

  it('allows empty description to clear the field', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    const result = await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {
      description: '',
    })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { description: '' })
    expect(result.id).toBe('t1')
  })
})

describe('parsePriority', () => {
  it('parses named priorities', async () => {
    const { parsePriority } = await import('../../../src/commands/update.js')
    expect(parsePriority('urgent')).toBe(1)
    expect(parsePriority('high')).toBe(2)
    expect(parsePriority('normal')).toBe(3)
    expect(parsePriority('low')).toBe(4)
  })

  it('parses numeric priorities', async () => {
    const { parsePriority } = await import('../../../src/commands/update.js')
    expect(parsePriority('1')).toBe(1)
    expect(parsePriority('4')).toBe(4)
  })

  it('is case-insensitive', async () => {
    const { parsePriority } = await import('../../../src/commands/update.js')
    expect(parsePriority('URGENT')).toBe(1)
    expect(parsePriority('High')).toBe(2)
  })

  it('throws on invalid priority', async () => {
    const { parsePriority } = await import('../../../src/commands/update.js')
    expect(() => parsePriority('5')).toThrow('Priority must be')
    expect(() => parsePriority('invalid')).toThrow('Priority must be')
  })
})

describe('parseDueDate', () => {
  it('parses YYYY-MM-DD format', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    const result = parseDueDate('2025-03-15')
    expect(result).toBe(new Date('2025-03-15').getTime())
  })

  it('throws on invalid date format', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    expect(() => parseDueDate('not-a-date')).toThrow('YYYY-MM-DD')
  })

  it('throws on partial date', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    expect(() => parseDueDate('2025-02')).toThrow('YYYY-MM-DD')
    expect(() => parseDueDate('2025')).toThrow('YYYY-MM-DD')
  })
})

describe('parseAssigneeId', () => {
  it('parses numeric string to number', async () => {
    const { parseAssigneeId } = await import('../../../src/commands/update.js')
    expect(parseAssigneeId('12345')).toBe(12345)
  })

  it('throws on non-numeric string', async () => {
    const { parseAssigneeId } = await import('../../../src/commands/update.js')
    expect(() => parseAssigneeId('abc')).toThrow('numeric user ID')
  })
})

describe('buildUpdatePayload', () => {
  it('builds payload with priority', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ priority: 'high' })
    expect(payload).toEqual({ priority: 2 })
  })

  it('builds payload with due date', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ dueDate: '2025-06-01' })
    expect(payload.due_date).toBe(new Date('2025-06-01').getTime())
    expect(payload.due_date_time).toBe(false)
  })

  it('builds payload with assignee', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ assignee: '12345' })
    expect(payload.assignees).toEqual({ add: [12345] })
  })

  it('builds payload with all fields', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({
      name: 'New name',
      status: 'done',
      priority: 'urgent',
      dueDate: '2025-01-01',
      assignee: '99',
    })
    expect(payload.name).toBe('New name')
    expect(payload.status).toBe('done')
    expect(payload.priority).toBe(1)
    expect(payload.due_date).toBe(new Date('2025-01-01').getTime())
    expect(payload.assignees).toEqual({ add: [99] })
  })

  it('throws on non-numeric assignee', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    expect(() => buildUpdatePayload({ assignee: 'abc' })).toThrow('numeric user ID')
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
    ).rejects.toThrow('empty')
  })
})
