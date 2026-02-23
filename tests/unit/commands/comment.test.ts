import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPostComment = vi.fn().mockResolvedValue({ id: 'c1' })

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    postComment: mockPostComment,
  })),
}))

describe('postComment', () => {
  beforeEach(() => {
    mockPostComment.mockClear()
  })

  it('posts comment and returns id', async () => {
    const { postComment } = await import('../../../src/commands/comment.js')
    const result = await postComment({ apiToken: 'pk_t', teamId: 'team1' }, 't1', 'hello world')
    expect(mockPostComment).toHaveBeenCalledWith('t1', 'hello world')
    expect(result.id).toBe('c1')
  })

  it('throws when comment text is empty', async () => {
    const { postComment } = await import('../../../src/commands/comment.js')
    await expect(postComment({ apiToken: 'pk_t', teamId: 'team1' }, 't1', '')).rejects.toThrow(
      'empty',
    )
  })

  it('throws when comment text is only whitespace', async () => {
    const { postComment } = await import('../../../src/commands/comment.js')
    await expect(postComment({ apiToken: 'pk_t', teamId: 'team1' }, 't1', '   ')).rejects.toThrow(
      'empty',
    )
  })
})
