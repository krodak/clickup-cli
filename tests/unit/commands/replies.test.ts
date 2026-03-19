import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetThreadedComments = vi.fn()
const mockCreateThreadedComment = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getThreadedComments: mockGetThreadedComments,
    createThreadedComment: mockCreateThreadedComment,
  })),
}))

vi.mock('chalk', () => ({
  default: {
    bold: (s: string) => s,
    dim: (s: string) => s,
  },
}))

const config = { apiToken: 'pk_t', teamId: 'team1' }

describe('getReplies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns replies from the API', async () => {
    const replies = [
      { id: 'r1', comment_text: 'reply 1', user: { username: 'alice' }, date: '1700000000000' },
    ]
    mockGetThreadedComments.mockResolvedValue(replies)
    const { getReplies } = await import('../../../src/commands/replies.js')
    const result = await getReplies(config, 'c1')
    expect(result).toEqual(replies)
    expect(mockGetThreadedComments).toHaveBeenCalledWith('c1')
  })
})

describe('createReply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a threaded reply', async () => {
    const { createReply } = await import('../../../src/commands/replies.js')
    await createReply(config, 'c1', 'my reply')
    expect(mockCreateThreadedComment).toHaveBeenCalledWith('c1', 'my reply', undefined)
  })

  it('throws when reply text is empty', async () => {
    const { createReply } = await import('../../../src/commands/replies.js')
    await expect(createReply(config, 'c1', '')).rejects.toThrow('empty')
  })

  it('throws when reply text is only whitespace', async () => {
    const { createReply } = await import('../../../src/commands/replies.js')
    await expect(createReply(config, 'c1', '   ')).rejects.toThrow('empty')
  })

  it('passes notifyAll to the API client', async () => {
    const { createReply } = await import('../../../src/commands/replies.js')
    await createReply(config, 'c1', 'ping everyone', true)
    expect(mockCreateThreadedComment).toHaveBeenCalledWith('c1', 'ping everyone', true)
  })
})

describe('formatReplies', () => {
  it('returns "No replies" for empty array', async () => {
    const { formatReplies } = await import('../../../src/commands/replies.js')
    expect(formatReplies([])).toBe('No replies')
  })

  it('formats replies with user and date', async () => {
    const { formatReplies } = await import('../../../src/commands/replies.js')
    const replies = [
      { id: 'r1', comment_text: 'hello', user: { username: 'bob' }, date: '1700000000000' },
    ]
    const output = formatReplies(replies)
    expect(output).toContain('bob')
    expect(output).toContain('hello')
  })

  it('shows "Unknown" when user is missing', async () => {
    const { formatReplies } = await import('../../../src/commands/replies.js')
    const replies = [
      { id: 'r1', comment_text: 'hello', user: undefined as never, date: '1700000000000' },
    ]
    const output = formatReplies(replies)
    expect(output).toContain('Unknown')
  })
})
