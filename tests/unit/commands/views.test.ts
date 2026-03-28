import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetListViews = vi.fn()
const mockGetSpaceViews = vi.fn()
const mockGetFolderViews = vi.fn()
const mockGetWorkspaceViews = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getListViews: mockGetListViews,
      getSpaceViews: mockGetSpaceViews,
      getFolderViews: mockGetFolderViews,
      getWorkspaceViews: mockGetWorkspaceViews,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleViews = [
  { id: 'v1', name: 'Board View', type: 'board' },
  { id: 'v2', name: 'List View', type: 'list' },
]

describe('listViews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list views from API by default', async () => {
    mockGetListViews.mockResolvedValue({ views: sampleViews, required_views: {} })
    const { listViews } = await import('../../../src/commands/views.js')
    const result = await listViews(mockConfig, 'list1')
    expect(result).toEqual(sampleViews)
    expect(mockGetListViews).toHaveBeenCalledWith('list1')
  })

  it('returns space views when container is "space"', async () => {
    mockGetSpaceViews.mockResolvedValue(sampleViews)
    const { listViews } = await import('../../../src/commands/views.js')
    const result = await listViews(mockConfig, 's1', 'space')
    expect(result).toEqual(sampleViews)
    expect(mockGetSpaceViews).toHaveBeenCalledWith('s1')
  })

  it('returns folder views when container is "folder"', async () => {
    mockGetFolderViews.mockResolvedValue(sampleViews)
    const { listViews } = await import('../../../src/commands/views.js')
    const result = await listViews(mockConfig, 'f1', 'folder')
    expect(result).toEqual(sampleViews)
    expect(mockGetFolderViews).toHaveBeenCalledWith('f1')
  })

  it('returns workspace views when container is "workspace"', async () => {
    mockGetWorkspaceViews.mockResolvedValue(sampleViews)
    const { listViews } = await import('../../../src/commands/views.js')
    const result = await listViews(mockConfig, 'ignored', 'workspace')
    expect(result).toEqual(sampleViews)
    expect(mockGetWorkspaceViews).toHaveBeenCalledWith('team1')
  })
})

describe('formatViews', () => {
  it('returns "No views" for empty array', async () => {
    const { formatViews } = await import('../../../src/commands/views.js')
    expect(formatViews([])).toBe('No views')
  })

  it('formats views with name, id, and type', async () => {
    const { formatViews } = await import('../../../src/commands/views.js')
    const result = formatViews(sampleViews)
    expect(result).toContain('Board View')
    expect(result).toContain('List View')
  })
})

describe('formatViewsMarkdown', () => {
  it('returns "No views" for empty array', async () => {
    const { formatViewsMarkdown } = await import('../../../src/commands/views.js')
    expect(formatViewsMarkdown([])).toBe('No views')
  })

  it('formats views as markdown list with hyphen separator', async () => {
    const { formatViewsMarkdown } = await import('../../../src/commands/views.js')
    const result = formatViewsMarkdown(sampleViews)
    expect(result).toBe('- **Board View** (v1) - board\n- **List View** (v2) - list')
    expect(result).not.toContain('\u2014')
  })
})
