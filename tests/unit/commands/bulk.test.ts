import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUpdateTask = vi.fn()
const mockGetMe = vi.fn().mockResolvedValue({ id: 42, username: 'me' })
const mockAddTagToTask = vi.fn().mockResolvedValue(undefined)
const mockRemoveTagFromTask = vi.fn().mockResolvedValue(undefined)
const mockGetTask = vi.fn()
const mockSetCustomFieldValue = vi.fn().mockResolvedValue(undefined)
const mockMoveTaskToList = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      updateTask: mockUpdateTask,
      getMe: mockGetMe,
      addTagToTask: mockAddTagToTask,
      removeTagFromTask: mockRemoveTagFromTask,
      getTask: mockGetTask,
      setCustomFieldValue: mockSetCustomFieldValue,
      moveTaskToList: mockMoveTaskToList,
      getUserTimezone: vi.fn().mockResolvedValue(undefined),
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('bulkUpdateStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates all tasks successfully', async () => {
    mockUpdateTask.mockResolvedValue({})
    const { bulkUpdateStatus } = await import('../../../src/commands/bulk.js')
    const result = await bulkUpdateStatus(mockConfig, ['t1', 't2', 't3'], 'done')

    expect(mockUpdateTask).toHaveBeenCalledTimes(3)
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { status: 'done' })
    expect(mockUpdateTask).toHaveBeenCalledWith('t2', { status: 'done' })
    expect(mockUpdateTask).toHaveBeenCalledWith('t3', { status: 'done' })
    expect(result).toEqual({ updated: 3, failed: [] })
  })

  it('collects failed task IDs with reasons', async () => {
    mockUpdateTask
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce({})

    const { bulkUpdateStatus } = await import('../../../src/commands/bulk.js')
    const result = await bulkUpdateStatus(mockConfig, ['t1', 't2', 't3'], 'in progress')

    expect(result).toEqual({
      updated: 2,
      failed: [{ id: 't2', reason: 'Not found' }],
    })
  })

  it('handles empty task list', async () => {
    const { bulkUpdateStatus } = await import('../../../src/commands/bulk.js')
    const result = await bulkUpdateStatus(mockConfig, [], 'done')

    expect(mockUpdateTask).not.toHaveBeenCalled()
    expect(result).toEqual({ updated: 0, failed: [] })
  })

  it('captures non-Error failure reasons', async () => {
    mockUpdateTask.mockRejectedValueOnce('string error')

    const { bulkUpdateStatus } = await import('../../../src/commands/bulk.js')
    const result = await bulkUpdateStatus(mockConfig, ['t1'], 'done')

    expect(result.failed).toEqual([{ id: 't1', reason: 'string error' }])
  })
})

describe('bulkAssign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMe.mockResolvedValue({ id: 42, username: 'me' })
  })

  it('adds assignee to all tasks', async () => {
    mockUpdateTask.mockResolvedValue({})
    const { bulkAssign } = await import('../../../src/commands/bulk.js')
    const result = await bulkAssign(mockConfig, '99', ['t1', 't2'], 'add')

    expect(mockUpdateTask).toHaveBeenCalledTimes(2)
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { assignees: { add: [99] } })
    expect(mockUpdateTask).toHaveBeenCalledWith('t2', { assignees: { add: [99] } })
    expect(result).toEqual({ updated: 2, failed: [] })
  })

  it('removes assignee from all tasks', async () => {
    mockUpdateTask.mockResolvedValue({})
    const { bulkAssign } = await import('../../../src/commands/bulk.js')
    const result = await bulkAssign(mockConfig, '99', ['t1', 't2'], 'remove')

    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { assignees: { rem: [99] } })
    expect(mockUpdateTask).toHaveBeenCalledWith('t2', { assignees: { rem: [99] } })
    expect(result).toEqual({ updated: 2, failed: [] })
  })

  it('resolves "me" once via getMe, not per task', async () => {
    mockUpdateTask.mockResolvedValue({})
    const { bulkAssign } = await import('../../../src/commands/bulk.js')
    await bulkAssign(mockConfig, 'me', ['t1', 't2', 't3'], 'add')

    expect(mockGetMe).toHaveBeenCalledTimes(1)
    expect(mockUpdateTask).toHaveBeenCalledTimes(3)
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { assignees: { add: [42] } })
  })

  it('collects partial failures and continues', async () => {
    mockUpdateTask
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Task not found'))
      .mockResolvedValueOnce({})

    const { bulkAssign } = await import('../../../src/commands/bulk.js')
    const result = await bulkAssign(mockConfig, '99', ['t1', 't2', 't3'], 'add')

    expect(result).toEqual({
      updated: 2,
      failed: [{ id: 't2', reason: 'Task not found' }],
    })
  })
})

describe('bulkDueDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets due date from YYYY-MM-DD string', async () => {
    mockUpdateTask.mockResolvedValue({})
    const { bulkDueDate } = await import('../../../src/commands/bulk.js')
    const result = await bulkDueDate(mockConfig, '2025-06-15', ['t1', 't2'])

    const expectedMs = Date.UTC(2025, 5, 15)
    expect(mockUpdateTask).toHaveBeenCalledTimes(2)
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', {
      due_date: expectedMs,
      due_date_time: false,
    })
    expect(mockUpdateTask).toHaveBeenCalledWith('t2', {
      due_date: expectedMs,
      due_date_time: false,
    })
    expect(result).toEqual({ updated: 2, failed: [] })
  })

  it('clears due date when date is "none"', async () => {
    mockUpdateTask.mockResolvedValue({})
    const { bulkDueDate } = await import('../../../src/commands/bulk.js')
    await bulkDueDate(mockConfig, 'none', ['t1'])

    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { due_date: null })
  })

  it('clears due date when date is "clear"', async () => {
    mockUpdateTask.mockResolvedValue({})
    const { bulkDueDate } = await import('../../../src/commands/bulk.js')
    await bulkDueDate(mockConfig, 'clear', ['t1'])

    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { due_date: null })
  })

  it('collects partial failures and continues', async () => {
    mockUpdateTask.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Not found'))

    const { bulkDueDate } = await import('../../../src/commands/bulk.js')
    const result = await bulkDueDate(mockConfig, 'none', ['t1', 't2'])

    expect(result).toEqual({
      updated: 1,
      failed: [{ id: 't2', reason: 'Not found' }],
    })
  })
})

describe('bulkTag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddTagToTask.mockResolvedValue(undefined)
    mockRemoveTagFromTask.mockResolvedValue(undefined)
  })

  it('adds tag to all tasks', async () => {
    const { bulkTag } = await import('../../../src/commands/bulk.js')
    const result = await bulkTag(mockConfig, 'bug', ['t1', 't2'], 'add')

    expect(mockAddTagToTask).toHaveBeenCalledTimes(2)
    expect(mockAddTagToTask).toHaveBeenCalledWith('t1', 'bug')
    expect(mockAddTagToTask).toHaveBeenCalledWith('t2', 'bug')
    expect(mockRemoveTagFromTask).not.toHaveBeenCalled()
    expect(result).toEqual({ updated: 2, failed: [] })
  })

  it('removes tag from all tasks', async () => {
    const { bulkTag } = await import('../../../src/commands/bulk.js')
    const result = await bulkTag(mockConfig, 'bug', ['t1', 't2'], 'remove')

    expect(mockRemoveTagFromTask).toHaveBeenCalledTimes(2)
    expect(mockRemoveTagFromTask).toHaveBeenCalledWith('t1', 'bug')
    expect(mockRemoveTagFromTask).toHaveBeenCalledWith('t2', 'bug')
    expect(mockAddTagToTask).not.toHaveBeenCalled()
    expect(result).toEqual({ updated: 2, failed: [] })
  })

  it('collects partial failures and continues', async () => {
    mockAddTagToTask.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Tag error'))

    const { bulkTag } = await import('../../../src/commands/bulk.js')
    const result = await bulkTag(mockConfig, 'bug', ['t1', 't2'], 'add')

    expect(result).toEqual({
      updated: 1,
      failed: [{ id: 't2', reason: 'Tag error' }],
    })
  })
})

describe('bulkPriority', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets numeric priority on all tasks', async () => {
    mockUpdateTask.mockResolvedValue({})
    const { bulkPriority } = await import('../../../src/commands/bulk.js')
    const result = await bulkPriority(mockConfig, '1', ['t1', 't2'])

    expect(mockUpdateTask).toHaveBeenCalledTimes(2)
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { priority: 1 })
    expect(mockUpdateTask).toHaveBeenCalledWith('t2', { priority: 1 })
    expect(result).toEqual({ updated: 2, failed: [] })
  })

  it('accepts named priority values', async () => {
    mockUpdateTask.mockResolvedValue({})
    const { bulkPriority } = await import('../../../src/commands/bulk.js')
    await bulkPriority(mockConfig, 'urgent', ['t1'])
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { priority: 1 })

    await bulkPriority(mockConfig, 'high', ['t1'])
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { priority: 2 })

    await bulkPriority(mockConfig, 'normal', ['t1'])
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { priority: 3 })

    await bulkPriority(mockConfig, 'low', ['t1'])
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { priority: 4 })
  })

  it('rejects invalid priority values before calling the API', async () => {
    const { bulkPriority } = await import('../../../src/commands/bulk.js')
    await expect(bulkPriority(mockConfig, 'bogus', ['t1', 't2'])).rejects.toThrow(
      /urgent, high, normal, low, or 1-4/,
    )
    expect(mockUpdateTask).not.toHaveBeenCalled()
  })

  it('collects partial failures and continues', async () => {
    mockUpdateTask
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Priority error'))
      .mockResolvedValueOnce({})

    const { bulkPriority } = await import('../../../src/commands/bulk.js')
    const result = await bulkPriority(mockConfig, 'high', ['t1', 't2', 't3'])

    expect(result).toEqual({
      updated: 2,
      failed: [{ id: 't2', reason: 'Priority error' }],
    })
  })
})

describe('bulkField', () => {
  const taskWithFields = {
    id: 't1',
    name: 'Task 1',
    custom_fields: [
      { id: 'f-notes', name: 'Notes', type: 'text', value: null, type_config: {} },
      { id: 'f-score', name: 'Score', type: 'number', value: null, type_config: {} },
      {
        id: 'f-stage',
        name: 'Stage',
        type: 'drop_down',
        value: null,
        type_config: {
          options: [
            { id: 'o-a', name: 'Alpha', orderindex: 0 },
            { id: 'o-b', name: 'Beta', orderindex: 1 },
          ],
        },
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTask.mockResolvedValue(taskWithFields)
    mockSetCustomFieldValue.mockResolvedValue(undefined)
  })

  it('fetches the first task to resolve the field ID', async () => {
    const { bulkField } = await import('../../../src/commands/bulk.js')
    await bulkField(mockConfig, 'Notes', 'hello', ['t1', 't2', 't3'])

    expect(mockGetTask).toHaveBeenCalledTimes(1)
    expect(mockGetTask).toHaveBeenCalledWith('t1')
  })

  it('sets the same text value on all tasks in parallel', async () => {
    const { bulkField } = await import('../../../src/commands/bulk.js')
    const result = await bulkField(mockConfig, 'Notes', 'hello world', ['t1', 't2', 't3'])

    expect(mockSetCustomFieldValue).toHaveBeenCalledTimes(3)
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('t1', 'f-notes', 'hello world')
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('t2', 'f-notes', 'hello world')
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('t3', 'f-notes', 'hello world')
    expect(result).toEqual({ updated: 3, failed: [] })
  })

  it('parses numeric field values', async () => {
    const { bulkField } = await import('../../../src/commands/bulk.js')
    await bulkField(mockConfig, 'Score', '42', ['t1', 't2'])

    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('t1', 'f-score', 42)
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('t2', 'f-score', 42)
  })

  it('resolves dropdown option names to orderindex', async () => {
    const { bulkField } = await import('../../../src/commands/bulk.js')
    await bulkField(mockConfig, 'Stage', 'Beta', ['t1'])

    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('t1', 'f-stage', 1)
  })

  it('throws when the field name is not found on the task', async () => {
    const { bulkField } = await import('../../../src/commands/bulk.js')
    await expect(bulkField(mockConfig, 'Missing', 'x', ['t1', 't2'])).rejects.toThrow(
      /Field "Missing" not found/,
    )
    expect(mockSetCustomFieldValue).not.toHaveBeenCalled()
  })

  it('collects partial failures and continues', async () => {
    mockSetCustomFieldValue
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Field write failed'))
      .mockResolvedValueOnce(undefined)

    const { bulkField } = await import('../../../src/commands/bulk.js')
    const result = await bulkField(mockConfig, 'Notes', 'hi', ['t1', 't2', 't3'])

    expect(result).toEqual({
      updated: 2,
      failed: [{ id: 't2', reason: 'Field write failed' }],
    })
  })
})

describe('bulkMove', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMoveTaskToList.mockResolvedValue(undefined)
  })

  it('calls moveTaskToList for each task with the destination listId', async () => {
    const { bulkMove } = await import('../../../src/commands/bulk.js')
    const result = await bulkMove(mockConfig, 'l99', ['t1', 't2', 't3'])

    expect(mockMoveTaskToList).toHaveBeenCalledTimes(3)
    expect(mockMoveTaskToList).toHaveBeenCalledWith('t1', 'l99')
    expect(mockMoveTaskToList).toHaveBeenCalledWith('t2', 'l99')
    expect(mockMoveTaskToList).toHaveBeenCalledWith('t3', 'l99')
    expect(result).toEqual({ updated: 3, failed: [] })
  })

  it('throws when listId is empty', async () => {
    const { bulkMove } = await import('../../../src/commands/bulk.js')
    await expect(bulkMove(mockConfig, '', ['t1', 't2'])).rejects.toThrow(
      /--to <listId> is required/,
    )
    expect(mockMoveTaskToList).not.toHaveBeenCalled()
  })

  it('throws when no task IDs are provided', async () => {
    const { bulkMove } = await import('../../../src/commands/bulk.js')
    await expect(bulkMove(mockConfig, 'l99', [])).rejects.toThrow(/at least one task ID/)
    expect(mockMoveTaskToList).not.toHaveBeenCalled()
  })

  it('collects partial failures and continues', async () => {
    mockMoveTaskToList
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Destination list not found'))
      .mockResolvedValueOnce(undefined)

    const { bulkMove } = await import('../../../src/commands/bulk.js')
    const result = await bulkMove(mockConfig, 'l99', ['t1', 't2', 't3'])

    expect(result).toEqual({
      updated: 2,
      failed: [{ id: 't2', reason: 'Destination list not found' }],
    })
  })
})

describe('parallel execution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs bulk status updates in parallel without waiting for prior calls', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    mockUpdateTask.mockImplementation(async () => {
      await gate
      return {}
    })

    const { bulkUpdateStatus } = await import('../../../src/commands/bulk.js')
    const promise = bulkUpdateStatus(mockConfig, ['t1', 't2', 't3', 't4', 't5'], 'done')

    await Promise.resolve()
    await Promise.resolve()

    expect(mockUpdateTask).toHaveBeenCalledTimes(5)

    release()
    const result = await promise
    expect(result).toEqual({ updated: 5, failed: [] })
  })

  it('caps concurrency at 5 and processes remaining items in the next batch', async () => {
    const inFlight: string[] = []
    let peak = 0
    const resolvers: Array<() => void> = []

    mockUpdateTask.mockImplementation(async (id: string) => {
      inFlight.push(id)
      peak = Math.max(peak, inFlight.length)
      await new Promise<void>(resolve => {
        resolvers.push(() => {
          inFlight.splice(inFlight.indexOf(id), 1)
          resolve()
        })
      })
      return {}
    })

    const { bulkUpdateStatus } = await import('../../../src/commands/bulk.js')
    const ids = ['t1', 't2', 't3', 't4', 't5', 't6', 't7']
    const promise = bulkUpdateStatus(mockConfig, ids, 'done')

    while (resolvers.length < 5) {
      await Promise.resolve()
    }
    expect(inFlight).toHaveLength(5)

    for (const resolver of resolvers.splice(0, 5)) {
      resolver()
    }

    while (resolvers.length < 2) {
      await Promise.resolve()
    }
    for (const resolver of resolvers.splice(0, 2)) {
      resolver()
    }

    const result = await promise
    expect(result).toEqual({ updated: 7, failed: [] })
    expect(peak).toBe(5)
    expect(mockUpdateTask).toHaveBeenCalledTimes(7)
  })

  it('reports partial failures alongside successes across a parallel batch', async () => {
    mockUpdateTask
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Boom'))
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Kaboom'))
      .mockResolvedValueOnce({})

    const { bulkUpdateStatus } = await import('../../../src/commands/bulk.js')
    const result = await bulkUpdateStatus(mockConfig, ['t1', 't2', 't3', 't4', 't5'], 'in progress')

    expect(result.updated).toBe(3)
    expect(result.failed).toEqual([
      { id: 't2', reason: 'Boom' },
      { id: 't4', reason: 'Kaboom' },
    ])
  })
})
