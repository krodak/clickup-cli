import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateComment = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    updateComment: mockUpdateComment,
  })),
}))

describe('editComment', () => {
  beforeEach(() => {
    mockUpdateComment.mockClear()
  })

  it('updates comment text', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', 'updated text')
    expect(mockUpdateComment).toHaveBeenCalledWith('c1', 'updated text', undefined)
  })

  it('passes resolved flag when provided', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', 'updated text', true)
    expect(mockUpdateComment).toHaveBeenCalledWith('c1', 'updated text', true)
  })

  it('passes resolved=false when unresolved', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', 'updated text', false)
    expect(mockUpdateComment).toHaveBeenCalledWith('c1', 'updated text', false)
  })

  it('throws when comment text is empty', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await expect(editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', '')).rejects.toThrow(
      'empty',
    )
  })

  it('throws when comment text is only whitespace', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await expect(editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', '   ')).rejects.toThrow(
      'empty',
    )
  })
})
