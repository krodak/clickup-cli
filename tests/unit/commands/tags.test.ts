import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetSpaceTags = vi.fn()
const mockUpdateSpaceTag = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getSpaceTags: mockGetSpaceTags,
    updateSpaceTag: mockUpdateSpaceTag,
  })),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('listSpaceTags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns tags from API', async () => {
    const tags = [
      { name: 'bug', tag_fg: '#fff', tag_bg: '#f00' },
      { name: 'feature', tag_fg: '#fff', tag_bg: '#0f0' },
    ]
    mockGetSpaceTags.mockResolvedValue(tags)
    const { listSpaceTags } = await import('../../../src/commands/tags.js')
    const result = await listSpaceTags(mockConfig, 's1')
    expect(result).toEqual(tags)
    expect(mockGetSpaceTags).toHaveBeenCalledWith('s1')
  })
})

describe('formatTags', () => {
  it('returns "No tags found" for empty array', async () => {
    const { formatTags } = await import('../../../src/commands/tags.js')
    expect(formatTags([])).toBe('No tags found')
  })

  it('formats tags as comma-separated list', async () => {
    const { formatTags } = await import('../../../src/commands/tags.js')
    const result = formatTags([
      { name: 'bug', tag_fg: '#fff', tag_bg: '#f00' },
      { name: 'feature', tag_fg: '#fff', tag_bg: '#0f0' },
    ])
    expect(result).toContain('bug')
    expect(result).toContain('feature')
  })
})

describe('formatTagsMarkdown', () => {
  it('returns "No tags found" for empty array', async () => {
    const { formatTagsMarkdown } = await import('../../../src/commands/tags.js')
    expect(formatTagsMarkdown([])).toBe('No tags found')
  })

  it('formats tags as markdown list', async () => {
    const { formatTagsMarkdown } = await import('../../../src/commands/tags.js')
    const result = formatTagsMarkdown([
      { name: 'bug', tag_fg: '#fff', tag_bg: '#f00' },
      { name: 'feature', tag_fg: '#fff', tag_bg: '#0f0' },
    ])
    expect(result).toBe('- bug\n- feature')
  })
})

describe('updateSpaceTag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates a tag via API', async () => {
    mockUpdateSpaceTag.mockResolvedValue(undefined)
    const { updateSpaceTag } = await import('../../../src/commands/tags.js')
    await updateSpaceTag(mockConfig, 's1', 'old-tag', { name: 'new-tag' })
    expect(mockUpdateSpaceTag).toHaveBeenCalledWith('s1', 'old-tag', {
      name: 'new-tag',
      tag_fg: undefined,
      tag_bg: undefined,
    })
  })

  it('passes fg and bg colors', async () => {
    mockUpdateSpaceTag.mockResolvedValue(undefined)
    const { updateSpaceTag } = await import('../../../src/commands/tags.js')
    await updateSpaceTag(mockConfig, 's1', 'tag', { name: 'renamed', fg: '#fff', bg: '#000' })
    expect(mockUpdateSpaceTag).toHaveBeenCalledWith('s1', 'tag', {
      name: 'renamed',
      tag_fg: '#fff',
      tag_bg: '#000',
    })
  })
})
