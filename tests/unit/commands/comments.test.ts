import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetTaskComments = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getTaskComments: mockGetTaskComments,
  })),
}))

const mockIsTTY = vi.fn<() => boolean>()
const mockShouldOutputJson = vi.fn<(forceJson: boolean) => boolean>()

vi.mock('../../../src/output.js', async importOriginal => {
  const orig = await importOriginal<typeof import('../../../src/output.js')>()
  return {
    ...orig,
    isTTY: (...args: Parameters<typeof orig.isTTY>) => mockIsTTY(...args),
    shouldOutputJson: (...args: Parameters<typeof orig.shouldOutputJson>) =>
      mockShouldOutputJson(...args),
  }
})

describe('fetchComments', () => {
  beforeEach(() => {
    mockGetTaskComments.mockReset()
  })

  it('returns formatted comments', async () => {
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
    const { fetchComments } = await import('../../../src/commands/comments.js')
    const result = await fetchComments({ apiToken: 'pk_t', teamId: 'team1' }, 't1')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'c1',
      user: 'alice',
      date: '1700000000000',
      text: 'First comment',
    })
    expect(result[1]).toEqual({
      id: 'c2',
      user: 'bob',
      date: '1700001000000',
      text: 'Second comment',
    })
  })

  it('returns empty array when no comments', async () => {
    mockGetTaskComments.mockResolvedValue([])
    const { fetchComments } = await import('../../../src/commands/comments.js')
    const result = await fetchComments({ apiToken: 'pk_t', teamId: 'team1' }, 't1')
    expect(result).toHaveLength(0)
  })

  it('calls getTaskComments with correct task ID', async () => {
    mockGetTaskComments.mockResolvedValue([])
    const { fetchComments } = await import('../../../src/commands/comments.js')
    await fetchComments({ apiToken: 'pk_t', teamId: 'team1' }, 'abc123')
    expect(mockGetTaskComments).toHaveBeenCalledWith('abc123')
  })
})

describe('printComments', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  const sampleComments = [
    { id: 'c1', user: 'alice', date: '1700000000000', text: 'First comment' },
    { id: 'c2', user: 'bob', date: '1700001000000', text: 'Second comment' },
  ]

  beforeEach(() => {
    mockIsTTY.mockReset()
    mockShouldOutputJson.mockReset()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('outputs markdown when piped and forceJson is false', async () => {
    mockShouldOutputJson.mockReturnValue(false)
    mockIsTTY.mockReturnValue(false)
    const { printComments } = await import('../../../src/commands/comments.js')
    printComments(sampleComments, false)
    expect(logSpy).toHaveBeenCalledOnce()
    const output = logSpy.mock.calls[0]![0] as string
    expect(output).toContain('**alice**')
    expect(output).toContain('First comment')
    expect(output).toContain('---')
    expect(output).not.toContain('"id"')
  })

  it('outputs JSON when forceJson is true', async () => {
    mockShouldOutputJson.mockReturnValue(true)
    mockIsTTY.mockReturnValue(false)
    const { printComments } = await import('../../../src/commands/comments.js')
    printComments(sampleComments, true)
    expect(logSpy).toHaveBeenCalledOnce()
    const output = logSpy.mock.calls[0]![0] as string
    const parsed: unknown = JSON.parse(output)
    expect(parsed).toEqual(sampleComments)
  })
})
