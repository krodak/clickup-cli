import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetTaskComments = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getTaskComments: mockGetTaskComments,
  })),
}))

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
