import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetListComments = vi.fn()
const mockPostListComment = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getListComments: mockGetListComments,
      postListComment: mockPostListComment,
    }
  }),
}))

const config = { apiToken: 'pk_test', teamId: 'tm_1' }

describe('fetchListComments', () => {
  beforeEach(() => {
    mockGetListComments.mockReset()
  })

  it('returns formatted comments from list', async () => {
    mockGetListComments.mockResolvedValue([
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
    const { fetchListComments } = await import('../../../src/commands/list-comments.js')
    const result = await fetchListComments(config, 'list_1')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'c1',
      user: 'alice',
      date: '1700000000000',
      text: 'First comment',
    })
    expect(mockGetListComments).toHaveBeenCalledWith('list_1')
  })

  it('returns empty array when no comments', async () => {
    mockGetListComments.mockResolvedValue([])
    const { fetchListComments } = await import('../../../src/commands/list-comments.js')
    const result = await fetchListComments(config, 'list_1')
    expect(result).toHaveLength(0)
  })
})

describe('postListCommentCommand', () => {
  beforeEach(() => {
    mockPostListComment.mockReset()
  })

  it('posts a comment to a list', async () => {
    mockPostListComment.mockResolvedValue({ id: 'c_new' })
    const { postListCommentCommand } = await import('../../../src/commands/list-comments.js')
    const result = await postListCommentCommand(config, 'list_1', 'Hello', false)
    expect(mockPostListComment).toHaveBeenCalledWith('list_1', 'Hello', false)
    expect(result.id).toBe('c_new')
  })

  it('passes notifyAll flag through', async () => {
    mockPostListComment.mockResolvedValue({ id: 'c_new2' })
    const { postListCommentCommand } = await import('../../../src/commands/list-comments.js')
    await postListCommentCommand(config, 'list_1', 'Notify test', true)
    expect(mockPostListComment).toHaveBeenCalledWith('list_1', 'Notify test', true)
  })

  it('throws on empty comment text', async () => {
    const { postListCommentCommand } = await import('../../../src/commands/list-comments.js')
    await expect(postListCommentCommand(config, 'list_1', '  ', false)).rejects.toThrow(
      'Comment text cannot be empty',
    )
  })
})
