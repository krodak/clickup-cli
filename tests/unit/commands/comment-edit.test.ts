import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateComment = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      updateComment: mockUpdateComment,
    }
  }),
}))

describe('editComment', () => {
  beforeEach(() => {
    mockUpdateComment.mockClear()
  })

  it('updates comment text', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', 'updated text')
    expect(mockUpdateComment).toHaveBeenCalledWith(
      'c1',
      'updated text',
      undefined,
      expect.any(Array),
    )
  })

  it('passes resolved flag when provided', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', 'updated text', true)
    expect(mockUpdateComment).toHaveBeenCalledWith('c1', 'updated text', true, expect.any(Array))
  })

  it('passes resolved=false when unresolved', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', 'updated text', false)
    expect(mockUpdateComment).toHaveBeenCalledWith('c1', 'updated text', false, expect.any(Array))
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

  it('prepends mention tag blocks when mentionIds are provided', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', 'updated text', undefined, [7])
    const blocks = mockUpdateComment.mock.calls[0]![3]
    expect(blocks[0]).toEqual({ type: 'tag', user: { id: 7 } })
    expect(blocks[1]).toEqual({ text: ' ' })
  })

  it('resolves when only resolved flag is provided (no message)', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', undefined, true)
    expect(mockUpdateComment).toHaveBeenCalledWith('c1', '', true, undefined)
  })

  it('throws when neither message nor resolved flag provided', async () => {
    const { editComment } = await import('../../../src/commands/comment-edit.js')
    await expect(
      editComment({ apiToken: 'pk_t', teamId: 'team1' }, 'c1', undefined, undefined),
    ).rejects.toThrow('Provide at least one of')
  })
})
