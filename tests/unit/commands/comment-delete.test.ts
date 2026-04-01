import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDeleteComment = vi.fn().mockResolvedValue(undefined)
const mockGetMe = vi.fn().mockResolvedValue({ id: 42, username: 'me' })
const mockGetTaskComments = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      deleteComment: mockDeleteComment,
      getMe: mockGetMe,
      getTaskComments: mockGetTaskComments,
    }
  }),
}))

describe('comment-delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the comment', async () => {
    const { deleteComment } = await import('../../../src/commands/comment-delete.js')
    await deleteComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c123')
    expect(mockDeleteComment).toHaveBeenCalledWith('c123')
  })

  it('deletes my matching task comment', async () => {
    mockGetTaskComments.mockResolvedValueOnce([
      {
        id: 'c1',
        comment_text: 'old note',
        user: { id: 7, username: 'someone' },
        date: '1',
      },
      {
        id: 'c2',
        comment_text: 'report uploaded',
        user: { id: 42, username: 'me' },
        date: '2',
      },
    ])

    const { deleteCommentByTaskSelection } = await import('../../../src/commands/comment-delete.js')
    const result = await deleteCommentByTaskSelection(
      { apiToken: 'pk_t', teamId: 'team1' },
      't123',
      { mine: true, match: 'uploaded' },
    )

    expect(mockGetMe).toHaveBeenCalled()
    expect(mockGetTaskComments).toHaveBeenCalledWith('t123')
    expect(mockDeleteComment).toHaveBeenCalledWith('c2')
    expect(result).toEqual({ commentId: 'c2', taskId: 't123' })
  })

  it('fails when multiple my comments match', async () => {
    mockGetTaskComments.mockResolvedValueOnce([
      {
        id: 'c1',
        comment_text: 'report uploaded',
        user: { id: 42, username: 'me' },
        date: '1',
      },
      {
        id: 'c2',
        comment_text: 'report uploaded again',
        user: { id: 42, username: 'me' },
        date: '2',
      },
    ])

    const { deleteCommentByTaskSelection } = await import('../../../src/commands/comment-delete.js')

    await expect(
      deleteCommentByTaskSelection({ apiToken: 'pk_t', teamId: 'team1' }, 't123', {
        mine: true,
        match: 'report uploaded',
      }),
    ).rejects.toThrow('Multiple matching comments found')
    expect(mockDeleteComment).not.toHaveBeenCalled()
  })

  it('fails when mine is not enabled for task-scoped delete', async () => {
    const { deleteCommentByTaskSelection } = await import('../../../src/commands/comment-delete.js')

    await expect(
      deleteCommentByTaskSelection({ apiToken: 'pk_t', teamId: 'team1' }, 't123', { match: 'x' }),
    ).rejects.toThrow('Task-scoped comment deletion requires --mine')
  })
})
