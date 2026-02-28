import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetTask = vi.fn()
const mockGetTaskComments = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getTask: mockGetTask,
    getTaskComments: mockGetTaskComments,
  })),
}))

const mockTask = {
  id: 't1',
  name: 'My Task',
  description: 'Some description',
  status: { status: 'in progress', color: '#blue' },
  assignees: [{ id: 42, username: 'me' }],
  url: 'https://app.clickup.com/t/t1',
  list: { id: 'l1', name: 'Sprint 1' },
}

const mockComments = [
  {
    id: 'c1',
    user: 'alice',
    date: '1700000000000',
    text: 'First comment',
  },
  {
    id: 'c2',
    user: 'bob',
    date: '1700001000000',
    text: 'Second comment',
  },
]

describe('printActivity', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('outputs JSON when forceJson is true', async () => {
    const { printActivity } = await import('../../../src/commands/activity.js')
    const result = { task: mockTask, comments: mockComments } as Parameters<typeof printActivity>[0]

    printActivity(result, true)

    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2))
  })

  it('prints task detail and comment content in TTY mode', async () => {
    const outputModule = await import('../../../src/output.js')
    vi.spyOn(outputModule, 'isTTY').mockReturnValue(true)
    const { printActivity } = await import('../../../src/commands/activity.js')
    const result = { task: mockTask, comments: mockComments } as Parameters<typeof printActivity>[0]

    printActivity(result, false)

    const output = logSpy.mock.calls.map(c => c[0]).join('\n')
    expect(output).toContain('alice')
    expect(output).toContain('bob')
    expect(output).toContain('First comment')
    expect(output).toContain('Second comment')
    expect(logSpy.mock.calls.length).toBeGreaterThan(4)
  })

  it('prints no comments message when comments are empty', async () => {
    const outputModule = await import('../../../src/output.js')
    vi.spyOn(outputModule, 'isTTY').mockReturnValue(true)
    const { printActivity } = await import('../../../src/commands/activity.js')
    const result = { task: mockTask, comments: [] } as Parameters<typeof printActivity>[0]

    printActivity(result, false)

    const output = logSpy.mock.calls.map(c => c[0]).join('\n')
    expect(output).toContain('No comments.')
  })

  it('outputs JSON when non-TTY even without forceJson', async () => {
    const outputModule = await import('../../../src/output.js')
    vi.spyOn(outputModule, 'isTTY').mockReturnValue(false)
    const { printActivity } = await import('../../../src/commands/activity.js')
    const result = { task: mockTask, comments: mockComments } as Parameters<typeof printActivity>[0]

    printActivity(result, false)

    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2))
  })
})

describe('fetchActivity', () => {
  beforeEach(() => {
    mockGetTask.mockReset()
    mockGetTaskComments.mockReset()
  })

  it('returns task details and comments combined', async () => {
    mockGetTask.mockResolvedValue(mockTask)
    mockGetTaskComments.mockResolvedValue([
      {
        id: 'c1',
        comment_text: 'First comment',
        user: { username: 'alice' },
        date: '1700000000000',
      },
      {
        id: 'c2',
        comment_text: 'Second comment',
        user: { username: 'bob' },
        date: '1700001000000',
      },
    ])

    const { fetchActivity } = await import('../../../src/commands/activity.js')
    const result = await fetchActivity({ apiToken: 'pk_t', teamId: 'team1' }, 't1')

    expect(mockGetTask).toHaveBeenCalledWith('t1')
    expect(mockGetTaskComments).toHaveBeenCalledWith('t1')
    expect(result.task.id).toBe('t1')
    expect(result.task.name).toBe('My Task')
    expect(result.comments).toHaveLength(2)
    expect(result.comments[0]).toEqual({
      id: 'c1',
      user: 'alice',
      date: '1700000000000',
      text: 'First comment',
    })
    expect(result.comments[1]).toEqual({
      id: 'c2',
      user: 'bob',
      date: '1700001000000',
      text: 'Second comment',
    })
  })

  it('returns empty comments when none exist', async () => {
    mockGetTask.mockResolvedValue(mockTask)
    mockGetTaskComments.mockResolvedValue([])

    const { fetchActivity } = await import('../../../src/commands/activity.js')
    const result = await fetchActivity({ apiToken: 'pk_t', teamId: 'team1' }, 't1')

    expect(result.task.id).toBe('t1')
    expect(result.comments).toHaveLength(0)
  })
})
