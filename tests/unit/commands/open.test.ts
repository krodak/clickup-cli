import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetTask = vi.fn()
const mockGetMyTasks = vi.fn()
const mockGetMe = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getTask: mockGetTask,
    getMyTasks: mockGetMyTasks,
    getMe: mockGetMe,
  })),
}))

const mockOpenUrl = vi.fn()
vi.mock('../../../src/interactive.js', () => ({
  openUrl: mockOpenUrl,
}))

const mockIsTTY = vi.fn()
vi.mock('../../../src/output.js', () => ({
  isTTY: mockIsTTY,
}))

const config = { apiToken: 'pk_test', teamId: 'team_1' }

const fakeTask = {
  id: 'abc123',
  name: 'Fix login bug',
  description: 'Fix the login',
  status: { status: 'in progress', color: '#blue' },
  assignees: [{ id: 42, username: 'me' }],
  url: 'https://app.clickup.com/t/abc123',
  list: { id: 'l1', name: 'Sprint 1' },
}

const fakeTask2 = {
  id: 'def456',
  name: 'Fix logout bug',
  description: 'Fix the logout',
  status: { status: 'open', color: '#gray' },
  assignees: [{ id: 42, username: 'me' }],
  url: 'https://app.clickup.com/t/def456',
  list: { id: 'l1', name: 'Sprint 1' },
}

describe('openTask', () => {
  beforeEach(() => {
    mockGetTask.mockReset()
    mockGetMyTasks.mockReset()
    mockGetMe.mockReset()
    mockOpenUrl.mockReset()
    mockIsTTY.mockReset()
    mockIsTTY.mockReturnValue(false)
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('opens a task by ID directly', async () => {
    mockGetTask.mockResolvedValue(fakeTask)
    const { openTask } = await import('../../../src/commands/open.js')
    const result = await openTask(config, 'abc123')
    expect(mockGetTask).toHaveBeenCalledWith('abc123')
    expect(mockOpenUrl).toHaveBeenCalledWith('https://app.clickup.com/t/abc123')
    expect(result.id).toBe('abc123')
  })

  it('outputs JSON when --json flag is set', async () => {
    mockGetTask.mockResolvedValue(fakeTask)
    const { openTask } = await import('../../../src/commands/open.js')
    const result = await openTask(config, 'abc123', { json: true })
    expect(mockOpenUrl).not.toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(fakeTask, null, 2))
    expect(result.id).toBe('abc123')
  })

  it('prints name and URL in TTY mode before opening', async () => {
    mockIsTTY.mockReturnValue(true)
    mockGetTask.mockResolvedValue(fakeTask)
    const { openTask } = await import('../../../src/commands/open.js')
    await openTask(config, 'abc123')
    expect(console.log).toHaveBeenCalledWith('Fix login bug')
    expect(console.log).toHaveBeenCalledWith('https://app.clickup.com/t/abc123')
    expect(mockOpenUrl).toHaveBeenCalledWith('https://app.clickup.com/t/abc123')
  })

  it('falls back to name search when task ID lookup fails', async () => {
    mockGetTask.mockRejectedValueOnce(new Error('not found'))
    mockGetMe.mockResolvedValue({ id: 42, username: 'me' })
    mockGetMyTasks.mockResolvedValue([{ ...fakeTask, name: 'loginbug' }])
    mockGetTask.mockResolvedValueOnce({ ...fakeTask, name: 'loginbug' })
    const { openTask } = await import('../../../src/commands/open.js')
    const result = await openTask(config, 'loginbug')
    expect(result.id).toBe('abc123')
    expect(mockOpenUrl).toHaveBeenCalledWith('https://app.clickup.com/t/abc123')
  })

  it('searches by name when query contains spaces', async () => {
    mockGetMe.mockResolvedValue({ id: 42, username: 'me' })
    mockGetMyTasks.mockResolvedValue([fakeTask])
    mockGetTask.mockResolvedValue(fakeTask)
    const { openTask } = await import('../../../src/commands/open.js')
    const result = await openTask(config, 'Fix login')
    expect(result.id).toBe('abc123')
    expect(mockOpenUrl).toHaveBeenCalledWith('https://app.clickup.com/t/abc123')
  })

  it('throws when no tasks match the name query', async () => {
    mockGetMe.mockResolvedValue({ id: 42, username: 'me' })
    mockGetMyTasks.mockResolvedValue([])
    const { openTask } = await import('../../../src/commands/open.js')
    await expect(openTask(config, 'nonexistent task')).rejects.toThrow(
      'No tasks found matching "nonexistent task"',
    )
  })

  it('prints multiple matches and opens the first one', async () => {
    mockIsTTY.mockReturnValue(true)
    mockGetMe.mockResolvedValue({ id: 42, username: 'me' })
    mockGetMyTasks.mockResolvedValue([
      { ...fakeTask, name: 'Fix bug login' },
      { ...fakeTask2, name: 'Fix bug logout' },
    ])
    mockGetTask.mockResolvedValue({ ...fakeTask, name: 'Fix bug login' })
    const { openTask } = await import('../../../src/commands/open.js')
    const result = await openTask(config, 'Fix bug')
    expect(console.log).toHaveBeenCalledWith('Found 2 matches:')
    expect(console.log).toHaveBeenCalledWith('Opening first match...')
    expect(mockOpenUrl).toHaveBeenCalledWith('https://app.clickup.com/t/abc123')
    expect(result.id).toBe('abc123')
  })

  it('returns JSON for name search with --json', async () => {
    mockGetMe.mockResolvedValue({ id: 42, username: 'me' })
    mockGetMyTasks.mockResolvedValue([
      {
        id: 'abc123',
        name: 'Fix login bug',
        status: 'in progress',
        task_type: 'task',
        list: 'Sprint 1',
        url: 'https://app.clickup.com/t/abc123',
      },
    ])
    mockGetTask.mockResolvedValue(fakeTask)
    const { openTask } = await import('../../../src/commands/open.js')
    const result = await openTask(config, 'Fix login', { json: true })
    expect(mockOpenUrl).not.toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(fakeTask, null, 2))
    expect(result.id).toBe('abc123')
  })

  it('does not print task info in non-TTY mode', async () => {
    mockIsTTY.mockReturnValue(false)
    mockGetTask.mockResolvedValue(fakeTask)
    const { openTask } = await import('../../../src/commands/open.js')
    await openTask(config, 'abc123')
    expect(console.log).not.toHaveBeenCalledWith('Fix login bug')
    expect(mockOpenUrl).toHaveBeenCalledWith('https://app.clickup.com/t/abc123')
  })
})
