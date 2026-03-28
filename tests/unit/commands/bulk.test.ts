import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUpdateTask = vi.fn()
const mockGetMe = vi.fn().mockResolvedValue({ id: 42, username: 'me' })
const mockAddTagToTask = vi.fn().mockResolvedValue(undefined)
const mockRemoveTagFromTask = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      updateTask: mockUpdateTask,
      getMe: mockGetMe,
      addTagToTask: mockAddTagToTask,
      removeTagFromTask: mockRemoveTagFromTask,
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

    const expectedMs = new Date(2025, 5, 15).getTime()
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
