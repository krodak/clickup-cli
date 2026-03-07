import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAddTagToTask = vi.fn().mockResolvedValue(undefined)
const mockRemoveTagFromTask = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    addTagToTask: mockAddTagToTask,
    removeTagFromTask: mockRemoveTagFromTask,
  })),
}))

describe('manageTags', () => {
  beforeEach(() => {
    mockAddTagToTask.mockClear()
    mockRemoveTagFromTask.mockClear()
  })

  it('adds a single tag', async () => {
    const { manageTags } = await import('../../../src/commands/tag.js')
    const result = await manageTags({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', { add: 'bug' })
    expect(mockAddTagToTask).toHaveBeenCalledWith('task1', 'bug')
    expect(result.added).toEqual(['bug'])
    expect(result.removed).toEqual([])
  })

  it('adds multiple comma-separated tags', async () => {
    const { manageTags } = await import('../../../src/commands/tag.js')
    const result = await manageTags({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {
      add: 'bug,urgent',
    })
    expect(mockAddTagToTask).toHaveBeenCalledWith('task1', 'bug')
    expect(mockAddTagToTask).toHaveBeenCalledWith('task1', 'urgent')
    expect(result.added).toEqual(['bug', 'urgent'])
  })

  it('removes a single tag', async () => {
    const { manageTags } = await import('../../../src/commands/tag.js')
    const result = await manageTags({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {
      remove: 'wontfix',
    })
    expect(mockRemoveTagFromTask).toHaveBeenCalledWith('task1', 'wontfix')
    expect(result.removed).toEqual(['wontfix'])
    expect(result.added).toEqual([])
  })

  it('supports both --add and --remove in one call', async () => {
    const { manageTags } = await import('../../../src/commands/tag.js')
    const result = await manageTags({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {
      add: 'bug',
      remove: 'wontfix',
    })
    expect(mockAddTagToTask).toHaveBeenCalledWith('task1', 'bug')
    expect(mockRemoveTagFromTask).toHaveBeenCalledWith('task1', 'wontfix')
    expect(result.added).toEqual(['bug'])
    expect(result.removed).toEqual(['wontfix'])
  })

  it('trims whitespace from tag names', async () => {
    const { manageTags } = await import('../../../src/commands/tag.js')
    const result = await manageTags({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {
      add: ' bug , urgent ',
    })
    expect(mockAddTagToTask).toHaveBeenCalledWith('task1', 'bug')
    expect(mockAddTagToTask).toHaveBeenCalledWith('task1', 'urgent')
    expect(result.added).toEqual(['bug', 'urgent'])
  })

  it('throws when neither --add nor --remove provided', async () => {
    const { manageTags } = await import('../../../src/commands/tag.js')
    await expect(manageTags({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {})).rejects.toThrow(
      '--add',
    )
  })

  it('reports partial failure when add succeeds but remove fails', async () => {
    mockRemoveTagFromTask.mockRejectedValueOnce(new Error('tag not found'))
    const { manageTags } = await import('../../../src/commands/tag.js')
    await expect(
      manageTags({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', { add: 'bug', remove: 'wontfix' }),
    ).rejects.toThrow(/Added tags:.*bug.*failed to remove.*tag not found/)
  })

  it('throws original error when remove fails without prior adds', async () => {
    mockRemoveTagFromTask.mockRejectedValueOnce(new Error('tag not found'))
    const { manageTags } = await import('../../../src/commands/tag.js')
    await expect(
      manageTags({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', { remove: 'wontfix' }),
    ).rejects.toThrow('tag not found')
  })
})
