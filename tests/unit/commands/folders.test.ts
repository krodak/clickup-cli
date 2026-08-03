import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetFolders = vi.fn()
const mockGetFolderLists = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getFolders: mockGetFolders,
      getFolderLists: mockGetFolderLists,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('listFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns folders with their lists', async () => {
    mockGetFolders.mockResolvedValue([
      { id: 'f1', name: 'Sprint Folder' },
      { id: 'f2', name: 'Sprint Subfolder', parent_folder: 'f1' },
    ])
    mockGetFolderLists.mockResolvedValueOnce([{ id: 'l1', name: 'Sprint 1' }])
    mockGetFolderLists.mockResolvedValueOnce([{ id: 'l2', name: 'Sprint 2' }])
    const { listFolders } = await import('../../../src/commands/folders.js')
    const result = await listFolders(mockConfig, 's1')
    expect(result).toEqual([
      {
        id: 'f1',
        name: 'Sprint Folder',
        lists: [{ id: 'l1', name: 'Sprint 1' }],
      },
      {
        id: 'f2',
        name: 'Sprint Subfolder',
        parent_folder: 'f1',
        lists: [{ id: 'l2', name: 'Sprint 2' }],
      },
    ])
    expect(result[0]).not.toHaveProperty('parent_folder')
    expect(result[1]).toHaveProperty('parent_folder', 'f1')
    expect(mockGetFolders).toHaveBeenCalledWith('s1', undefined)
    expect(mockGetFolderLists).toHaveBeenCalledTimes(2)
  })

  it('filters by name (case-insensitive)', async () => {
    mockGetFolders.mockResolvedValue([
      { id: 'f1', name: 'Sprint Folder' },
      { id: 'f2', name: 'Backlog' },
    ])
    mockGetFolderLists.mockResolvedValue([])
    const { listFolders } = await import('../../../src/commands/folders.js')
    const result = await listFolders(mockConfig, 's1', 'sprint')
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('Sprint Folder')
  })

  it('returns empty array when no folders match', async () => {
    mockGetFolders.mockResolvedValue([{ id: 'f1', name: 'Sprint' }])
    const { listFolders } = await import('../../../src/commands/folders.js')
    const result = await listFolders(mockConfig, 's1', 'nonexistent')
    expect(result).toEqual([])
  })

  it('passes archived flag through to getFolders', async () => {
    mockGetFolders.mockResolvedValue([])
    const { listFolders } = await import('../../../src/commands/folders.js')
    await listFolders(mockConfig, 's1', undefined, true)
    expect(mockGetFolders).toHaveBeenCalledWith('s1', true)
  })
})

describe('formatFolders', () => {
  it('returns "No folders found" for empty array', async () => {
    const { formatFolders } = await import('../../../src/commands/folders.js')
    expect(formatFolders([])).toBe('No folders found')
  })

  it('shows folder names with list names', async () => {
    const { formatFolders } = await import('../../../src/commands/folders.js')
    const result = formatFolders([
      {
        id: 'f2',
        name: 'Sprint',
        parent_folder: 'f1',
        lists: [{ id: 'l1', name: 'Sprint 1' }],
      },
    ])
    expect(result).toBe('Sprint f2\n  > Sprint 1 l1')
  })
})

describe('formatFoldersMarkdown', () => {
  it('returns "No folders found" for empty array', async () => {
    const { formatFoldersMarkdown } = await import('../../../src/commands/folders.js')
    expect(formatFoldersMarkdown([])).toBe('No folders found')
  })

  it('renders nested markdown list', async () => {
    const { formatFoldersMarkdown } = await import('../../../src/commands/folders.js')
    const result = formatFoldersMarkdown([
      {
        id: 'f2',
        name: 'Sprint',
        parent_folder: 'f1',
        lists: [
          { id: 'l1', name: 'Sprint 1' },
          { id: 'l2', name: 'Sprint 2' },
        ],
      },
    ])
    expect(result).toBe('- **Sprint** (f2)\n  - Sprint 1 (l1)\n  - Sprint 2 (l2)')
  })

  it('handles folders without lists', async () => {
    const { formatFoldersMarkdown } = await import('../../../src/commands/folders.js')
    const result = formatFoldersMarkdown([{ id: 'f1', name: 'Empty', lists: [] }])
    expect(result).toBe('- **Empty** (f1)')
  })
})
