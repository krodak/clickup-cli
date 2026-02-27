import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ListSummary } from '../../../src/commands/lists.js'

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

const mockIsTTY = vi.fn<() => boolean>()
const mockShouldOutputJson = vi.fn<(forceJson: boolean) => boolean>()

vi.mock('../../../src/output.js', async importOriginal => {
  const orig = await importOriginal<typeof import('../../../src/output.js')>()
  return {
    ...orig,
    isTTY: (...args: Parameters<typeof orig.isTTY>) => mockIsTTY(...args),
    shouldOutputJson: (...args: Parameters<typeof orig.shouldOutputJson>) =>
      mockShouldOutputJson(...args),
  }
})

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

describe('printLists', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockIsTTY.mockReset()
    mockShouldOutputJson.mockReset()
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  const sampleLists: ListSummary[] = [
    { id: 'l1', name: 'Backlog', folder: '(none)' },
    { id: 'l2', name: 'Sprint 5', folder: 'Sprint' },
  ]

  it('outputs JSON when forceJson is true', async () => {
    mockShouldOutputJson.mockReturnValue(true)
    const { printLists } = await import('../../../src/commands/lists.js')
    printLists(sampleLists, true)
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(sampleLists, null, 2))
  })

  it('outputs markdown when piped (non-TTY)', async () => {
    mockShouldOutputJson.mockReturnValue(false)
    mockIsTTY.mockReturnValue(false)
    const { printLists } = await import('../../../src/commands/lists.js')
    printLists(sampleLists, false)
    const output = logSpy.mock.calls[0]![0] as string
    expect(output).toContain('| ID | Name | Folder |')
    expect(output).toContain('| l1 | Backlog | (none) |')
    expect(output).toContain('| l2 | Sprint 5 | Sprint |')
  })

  it('outputs markdown empty message when piped with no lists', async () => {
    mockShouldOutputJson.mockReturnValue(false)
    mockIsTTY.mockReturnValue(false)
    const { printLists } = await import('../../../src/commands/lists.js')
    printLists([], false)
    expect(logSpy).toHaveBeenCalledWith('No lists found.')
  })

  it('outputs TTY table when interactive', async () => {
    mockShouldOutputJson.mockReturnValue(false)
    mockIsTTY.mockReturnValue(true)
    const { printLists } = await import('../../../src/commands/lists.js')
    printLists(sampleLists, false)
    const output = logSpy.mock.calls[0]![0] as string
    expect(output).toContain('ID')
    expect(output).toContain('NAME')
    expect(output).toContain('FOLDER')
  })

  it('outputs empty message in TTY when no lists', async () => {
    mockShouldOutputJson.mockReturnValue(false)
    mockIsTTY.mockReturnValue(true)
    const { printLists } = await import('../../../src/commands/lists.js')
    printLists([], false)
    expect(logSpy).toHaveBeenCalledWith('No lists found.')
  })
})
