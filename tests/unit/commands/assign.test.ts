import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateTask = vi.fn()
const mockGetMe = vi.fn().mockResolvedValue({ id: 42, username: 'me' })
const mockGetGroups = vi.fn().mockResolvedValue([
  {
    id: '00000000-0000-0000-0000-000000000001',
    team_id: 'team1',
    name: 'Mobile Team',
    handle: 'mobile-team',
    date_created: '0',
    members: [],
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    team_id: 'team1',
    name: 'Backend',
    handle: 'backend',
    date_created: '0',
    members: [],
  },
])

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      updateTask: mockUpdateTask,
      getMe: mockGetMe,
      getGroups: mockGetGroups,
    }
  }),
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

  it('throws when no assignment flag is provided', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await expect(assignTask(config, 'abc123', {})).rejects.toThrow(
      'Provide at least one of: --to, --remove, --group, --remove-group',
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

  it('assigns multiple users via comma-separated --to', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { to: '10,20,30' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      assignees: { add: [10, 20, 30] },
    })
  })

  it('removes multiple users via comma-separated --remove', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { remove: '11,22' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      assignees: { rem: [11, 22] },
    })
  })

  it('supports "me" in a comma-separated list', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { to: 'me,99' })
    expect(mockGetMe).toHaveBeenCalled()
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      assignees: { add: [42, 99] },
    })
  })

  it('handles whitespace around commas', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { to: ' 10 , 20 ,30 ', remove: '1 , 2' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      assignees: { add: [10, 20, 30], rem: [1, 2] },
    })
  })

  it('adds a group assignee by handle', async () => {
    mockGetGroups.mockClear()
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { group: 'mobile-team' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      group_assignees: { add: ['00000000-0000-0000-0000-000000000001'] },
    })
  })

  it('adds a group assignee by @handle', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { group: '@backend' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      group_assignees: { add: ['00000000-0000-0000-0000-000000000002'] },
    })
  })

  it('adds a group assignee by UUID', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { group: '00000000-0000-0000-0000-000000000003' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      group_assignees: { add: ['00000000-0000-0000-0000-000000000003'] },
    })
  })

  it('removes a group assignee', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { removeGroup: 'mobile-team' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      group_assignees: { rem: ['00000000-0000-0000-0000-000000000001'] },
    })
  })

  it('supports comma-separated --group', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { group: 'mobile-team,@backend' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      group_assignees: {
        add: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
      },
    })
  })

  it('combines users and groups in a single call', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { to: '10', group: 'mobile-team' })
    expect(mockUpdateTask).toHaveBeenCalledWith('abc123', {
      assignees: { add: [10] },
      group_assignees: { add: ['00000000-0000-0000-0000-000000000001'] },
    })
  })

  it('caches getGroups across multiple handle resolutions in one call', async () => {
    mockGetGroups.mockClear()
    const { assignTask } = await import('../../../src/commands/assign.js')
    await assignTask(config, 'abc123', { group: 'mobile-team,@backend' })
    expect(mockGetGroups).toHaveBeenCalledOnce()
  })

  it('throws with available handles when group not found', async () => {
    const { assignTask } = await import('../../../src/commands/assign.js')
    await expect(assignTask(config, 'abc123', { group: 'nonexistent' })).rejects.toThrow(
      /Group "nonexistent" not found/,
    )
  })
})
