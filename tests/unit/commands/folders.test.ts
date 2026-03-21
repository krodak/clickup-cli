import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetFolders = vi.fn()
const mockGetFolderLists = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getFolders: mockGetFolders,
    getFolderLists: mockGetFolderLists,
  })),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('listFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns folders with their lists', async () => {
    mockGetFolders.mockResolvedValue([
      { id: 'f1', name: 'Sprint Folder' },
      { id: 'f2', name: 'Backlog' },
    ])
    mockGetFolderLists.mockResolvedValueOnce([{ id: 'l1', name: 'Sprint 1' }])
    mockGetFolderLists.mockResolvedValueOnce([{ id: 'l2', name: 'Backlog Items' }])
    const { listFolders } = await import('../../../src/commands/folders.js')
    const result = await listFolders(mockConfig, 's1')
    expect(result).toEqual([
      { id: 'f1', name: 'Sprint Folder', lists: [{ id: 'l1', name: 'Sprint 1' }] },
      { id: 'f2', name: 'Backlog', lists: [{ id: 'l2', name: 'Backlog Items' }] },
    ])
    expect(mockGetFolders).toHaveBeenCalledWith('s1')
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
})

describe('formatFolders', () => {
  it('returns "No folders found" for empty array', async () => {
    const { formatFolders } = await import('../../../src/commands/folders.js')
    expect(formatFolders([])).toBe('No folders found')
  })

  it('shows folder names with list names', async () => {
    const { formatFolders } = await import('../../../src/commands/folders.js')
    const result = formatFolders([
      { id: 'f1', name: 'Sprint', lists: [{ id: 'l1', name: 'Sprint 1' }] },
    ])
    expect(result).toContain('Sprint')
    expect(result).toContain('Sprint 1')
    expect(result).toContain('f1')
    expect(result).toContain('l1')
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
        id: 'f1',
        name: 'Sprint',
        lists: [
          { id: 'l1', name: 'Sprint 1' },
          { id: 'l2', name: 'Sprint 2' },
        ],
      },
    ])
    expect(result).toBe('- **Sprint** (f1)\n  - Sprint 1 (l1)\n  - Sprint 2 (l2)')
  })

  it('handles folders without lists', async () => {
    const { formatFoldersMarkdown } = await import('../../../src/commands/folders.js')
    const result = formatFoldersMarkdown([{ id: 'f1', name: 'Empty', lists: [] }])
    expect(result).toBe('- **Empty** (f1)')
  })
})
