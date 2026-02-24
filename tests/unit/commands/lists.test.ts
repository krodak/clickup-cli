import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetLists = vi.fn()
const mockGetFolders = vi.fn()
const mockGetFolderLists = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getLists: mockGetLists,
    getFolders: mockGetFolders,
    getFolderLists: mockGetFolderLists,
  })),
}))

describe('fetchLists', () => {
  beforeEach(() => {
    mockGetLists.mockReset()
    mockGetFolders.mockReset()
    mockGetFolderLists.mockReset()
  })

  it('returns folderless lists and folder lists combined', async () => {
    mockGetLists.mockResolvedValue([{ id: 'l1', name: 'Backlog' }])
    mockGetFolders.mockResolvedValue([{ id: 'f1', name: 'Sprint' }])
    mockGetFolderLists.mockResolvedValue([{ id: 'l2', name: 'Sprint 5' }])

    const { fetchLists } = await import('../../../src/commands/lists.js')
    const result = await fetchLists({ apiToken: 'pk_t', teamId: 'team1' }, 'space1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: 'l1', name: 'Backlog', folder: '(none)' })
    expect(result[1]).toEqual({ id: 'l2', name: 'Sprint 5', folder: 'Sprint' })
  })

  it('returns empty when no lists exist', async () => {
    mockGetLists.mockResolvedValue([])
    mockGetFolders.mockResolvedValue([])

    const { fetchLists } = await import('../../../src/commands/lists.js')
    const result = await fetchLists({ apiToken: 'pk_t', teamId: 'team1' }, 'space1')
    expect(result).toHaveLength(0)
  })

  it('filters by partial name (case-insensitive)', async () => {
    mockGetLists.mockResolvedValue([
      { id: 'l1', name: 'Backlog' },
      { id: 'l2', name: 'Sprint Board' },
    ])
    mockGetFolders.mockResolvedValue([])

    const { fetchLists } = await import('../../../src/commands/lists.js')
    const result = await fetchLists({ apiToken: 'pk_t', teamId: 'team1' }, 'space1', {
      name: 'sprint',
    })

    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('Sprint Board')
  })

  it('handles multiple folders', async () => {
    mockGetLists.mockResolvedValue([])
    mockGetFolders.mockResolvedValue([
      { id: 'f1', name: 'Folder A' },
      { id: 'f2', name: 'Folder B' },
    ])
    mockGetFolderLists
      .mockResolvedValueOnce([{ id: 'l1', name: 'List A1' }])
      .mockResolvedValueOnce([
        { id: 'l2', name: 'List B1' },
        { id: 'l3', name: 'List B2' },
      ])

    const { fetchLists } = await import('../../../src/commands/lists.js')
    const result = await fetchLists({ apiToken: 'pk_t', teamId: 'team1' }, 'space1')

    expect(result).toHaveLength(3)
    expect(result[0]!.folder).toBe('Folder A')
    expect(result[1]!.folder).toBe('Folder B')
    expect(result[2]!.folder).toBe('Folder B')
  })
})
