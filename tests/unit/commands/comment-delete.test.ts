import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDeleteComment = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    deleteComment: mockDeleteComment,
  })),
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
})
