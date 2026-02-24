import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateTask = vi.fn()
const mockGetMe = vi.fn().mockResolvedValue({ id: 42, username: 'me' })

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    updateTask: mockUpdateTask,
    getMe: mockGetMe,
  })),
}))

const config = { apiToken: 'pk_test', teamId: 'team1' }

const fakeTask = {
  id: 'abc123',
  name: 'Test Task',
  status: { status: 'open', color: '#fff' },
  assignees: [{ id: 42, username: 'me' }],
  url: 'https://app.clickup.com/t/abc123',
  list: { id: 'l1', name: 'List 1' },
}

describe('assignTask', () => {
  beforeEach(() => {
    mockUpdateTask.mockReset().mockResolvedValue(fakeTask)
    mockGetMe.mockReset().mockResolvedValue({ id: 42, username: 'me' })
  })

  it('adds an assignee by numeric ID', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    const result = await assignTask(config, 'abc123', { to: '99' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      assignees: { add: [99] },
    })
    expect(result).toEqual(fakeTask)
  })

  it('removes an assignee by numeric ID', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { remove: '55' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      assignees: { rem: [55] },
    })
  })

  it('resolves "me" to current user ID for --to', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { to: 'me' })
    expect(mockGetMe).toHaveBeenCalled()
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      assignees: { add: [42] },
    })
  })

  it('resolves "me" to current user ID for --remove', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { remove: 'me' })
    expect(mockGetMe).toHaveBeenCalled()
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      assignees: { rem: [42] },
    })
  })

  it('supports both --to and --remove in one call', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { to: '10', remove: '20' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      assignees: { add: [10], rem: [20] },
    })
  })

  it('throws when neither --to nor --remove is provided', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await expect(assignTask(config, 'abc123', {})).rejects.toThrow(
      'Provide at least one of: --to, --remove',
    )
  })

  it('throws on non-numeric --to value that is not "me"', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await expect(assignTask(config, 'abc123', { to: 'bob' })).rejects.toThrow('numeric user ID')
  })

  it('throws on non-numeric --remove value that is not "me"', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await expect(assignTask(config, 'abc123', { remove: 'alice' })).rejects.toThrow(
      'numeric user ID',
    )
  })

  it('does not call getMe for uppercase "Me"', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await expect(assignTask(config, 'abc123', { to: 'Me' })).rejects.toThrow('numeric user ID')
    expect(mockGetMe).not.toHaveBeenCalled()
  })

  it('returns the full task object from updateTask', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    const result = await assignTask(config, 'abc123', { to: '1' })
    expect(result.id).toBe('abc123')
    expect(result.name).toBe('Test Task')
    expect(result.assignees).toEqual([{ id: 42, username: 'me' }])
  })
})
