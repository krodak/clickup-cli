import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetTask = vi.fn().mockResolvedValue({
  id: 't1',
  name: 'Test Task',
  status: { status: 'open', color: '' },
  list: { id: 'l1', name: 'L1' },
  assignees: [],
  url: '',
})
const mockUpdateTask = vi.fn().mockResolvedValue({})

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return { getTask: mockGetTask, updateTask: mockUpdateTask }
  }),
}))

vi.mock('../../../src/output.js', () => ({
  isTTY: vi.fn().mockReturnValue(false),
}))

describe('archive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('archives a task with --confirm', async () => {
    const { archiveTaskCommand } = await import('../../../src/commands/archive.js')
    const result = await archiveTaskCommand({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {
      confirm: true,
    })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { archived: true })
    expect(result).toEqual({ taskId: 't1', archived: true })
  })

  it('unarchives a task with --unarchive --confirm', async () => {
    const { archiveTaskCommand } = await import('../../../src/commands/archive.js')
    const result = await archiveTaskCommand({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {
      confirm: true,
      unarchive: true,
    })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { archived: false })
    expect(result).toEqual({ taskId: 't1', archived: false })
  })

  it('throws without --confirm in non-interactive mode', async () => {
    const { archiveTaskCommand } = await import('../../../src/commands/archive.js')
    await expect(
      archiveTaskCommand({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {}),
    ).rejects.toThrow('--confirm')
  })
})
