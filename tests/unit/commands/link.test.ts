import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAddTaskLink = vi.fn().mockResolvedValue(undefined)
const mockDeleteTaskLink = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    addTaskLink: mockAddTaskLink,
    deleteTaskLink: mockDeleteTaskLink,
  })),
}))

const config = { apiToken: 'pk_t', teamId: 'team1' }

describe('manageTaskLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds a link between two tasks', async () => {
    const { manageTaskLink } = await import('../../../src/commands/link.js')
    const msg = await manageTaskLink(config, 'task1', 'task2', false)
    expect(mockAddTaskLink).toHaveBeenCalledWith('task1', 'task2')
    expect(msg).toContain('Linked')
    expect(msg).toContain('task1')
    expect(msg).toContain('task2')
  })

  it('removes a link between two tasks', async () => {
    const { manageTaskLink } = await import('../../../src/commands/link.js')
    const msg = await manageTaskLink(config, 'task1', 'task2', true)
    expect(mockDeleteTaskLink).toHaveBeenCalledWith('task1', 'task2')
    expect(msg).toContain('Removed')
    expect(msg).toContain('task1')
    expect(msg).toContain('task2')
  })
})
