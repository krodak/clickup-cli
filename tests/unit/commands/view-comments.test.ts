import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetViewComments = vi.fn()
const mockPostViewComment = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getViewComments: mockGetViewComments,
      postViewComment: mockPostViewComment,
    }
  }),
}))

const config = { apiToken: 'pk_test', teamId: 'tm_1' }

describe('fetchViewComments', () => {
  beforeEach(() => {
    mockGetViewComments.mockReset()
  })

  it('returns formatted comments from view', async () => {
    mockGetViewComments.mockResolvedValue([
      {
        id: 'vc1',
        comment_text: 'View comment',
        user: { username: 'carol' },
        date: '1700002000000',
      },
    ])
    const { fetchViewComments } = await import('../../../src/commands/view-comments.js')
    const result = await fetchViewComments(config, 'view_1')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'vc1',
      user: 'carol',
      date: '1700002000000',
      text: 'View comment',
    })
    expect(mockGetViewComments).toHaveBeenCalledWith('view_1')
  })

  it('returns empty array when no comments', async () => {
    mockGetViewComments.mockResolvedValue([])
    const { fetchViewComments } = await import('../../../src/commands/view-comments.js')
    const result = await fetchViewComments(config, 'view_1')
    expect(result).toHaveLength(0)
  })
})

describe('postViewCommentCommand', () => {
  beforeEach(() => {
    mockPostViewComment.mockReset()
  })

  it('posts a comment to a view', async () => {
    mockPostViewComment.mockResolvedValue({ id: 'vc_new' })
    const { postViewCommentCommand } = await import('../../../src/commands/view-comments.js')
    const result = await postViewCommentCommand(config, 'view_1', 'Hello', false)
    expect(mockPostViewComment).toHaveBeenCalledWith('view_1', 'Hello', false)
    expect(result.id).toBe('vc_new')
  })

  it('passes notifyAll flag through', async () => {
    mockPostViewComment.mockResolvedValue({ id: 'vc_new2' })
    const { postViewCommentCommand } = await import('../../../src/commands/view-comments.js')
    await postViewCommentCommand(config, 'view_1', 'Notify test', true)
    expect(mockPostViewComment).toHaveBeenCalledWith('view_1', 'Notify test', true)
  })

  it('throws on empty comment text', async () => {
    const { postViewCommentCommand } = await import('../../../src/commands/view-comments.js')
    await expect(postViewCommentCommand(config, 'view_1', '  ', false)).rejects.toThrow(
      'Comment text cannot be empty',
    )
  })
})
