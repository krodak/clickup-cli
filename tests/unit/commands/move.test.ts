import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAddTaskToList = vi.fn().mockResolvedValue(undefined)
const mockRemoveTaskFromList = vi.fn().mockResolvedValue(undefined)
const mockMoveTaskToList = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      addTaskToList: mockAddTaskToList,
      removeTaskFromList: mockRemoveTaskFromList,
      moveTaskToList: mockMoveTaskToList,
    }
  }),
}))

describe('moveTask', () => {
  beforeEach(() => {
    mockAddTaskToList.mockClear()
    mockRemoveTaskFromList.mockClear()
    mockMoveTaskToList.mockClear()
  })

  it('adds a task to a list', async () => {
    const { moveTask } = await import('../../../src/commands/move.js')
    const msg = await moveTask({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', { to: 'list2' })
    expect(mockAddTaskToList).toHaveBeenCalledWith('task1', 'list2')
    expect(msg).toContain('Added')
    expect(msg).toContain('list2')
  })

  it('removes a task from a list', async () => {
    const { moveTask } = await import('../../../src/commands/move.js')
    const msg = await moveTask({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', { remove: 'list3' })
    expect(mockRemoveTaskFromList).toHaveBeenCalledWith('task1', 'list3')
    expect(msg).toContain('Removed')
    expect(msg).toContain('list3')
  })

  it('uses v3 move endpoint when both --to and --remove are provided', async () => {
    const { moveTask } = await import('../../../src/commands/move.js')
    const msg = await moveTask({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {
      to: 'list2',
      remove: 'list1',
    })
    expect(mockMoveTaskToList).toHaveBeenCalledWith('task1', 'list2')
    expect(mockAddTaskToList).not.toHaveBeenCalled()
    expect(mockRemoveTaskFromList).not.toHaveBeenCalled()
    expect(msg).toContain('Moved')
    expect(msg).toContain('list1')
    expect(msg).toContain('list2')
  })

  it('throws when remove fails', async () => {
    mockRemoveTaskFromList.mockRejectedValueOnce(new Error('list not found'))
    const { moveTask } = await import('../../../src/commands/move.js')
    await expect(
      moveTask({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', { remove: 'list3' }),
    ).rejects.toThrow('list not found')
  })

  it('throws when neither --to nor --remove is provided', async () => {
    const { moveTask } = await import('../../../src/commands/move.js')
    await expect(moveTask({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {})).rejects.toThrow('--to')
  })
})
