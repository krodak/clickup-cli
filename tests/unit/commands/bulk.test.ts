import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUpdateTask = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    updateTask: mockUpdateTask,
  })),
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

  it('collects failed task IDs', async () => {
    mockUpdateTask
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce({})

    const { bulkUpdateStatus } = await import('../../../src/commands/bulk.js')
    const result = await bulkUpdateStatus(mockConfig, ['t1', 't2', 't3'], 'in progress')

    expect(result).toEqual({ updated: 2, failed: ['t2'] })
  })

  it('handles empty task list', async () => {
    const { bulkUpdateStatus } = await import('../../../src/commands/bulk.js')
    const result = await bulkUpdateStatus(mockConfig, [], 'done')

    expect(mockUpdateTask).not.toHaveBeenCalled()
    expect(result).toEqual({ updated: 0, failed: [] })
  })
})
