import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetDocs = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getDocs: mockGetDocs,
  })),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('listDocs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all docs when no query', async () => {
    const docs = [
      { id: 'd1', name: 'Design Spec', workspace_id: 1 },
      { id: 'd2', name: 'API Guide', workspace_id: 1 },
    ]
    mockGetDocs.mockResolvedValue(docs)
    const { listDocs } = await import('../../../src/commands/docs.js')
    const result = await listDocs(mockConfig, undefined)
    expect(result).toEqual(docs)
    expect(mockGetDocs).toHaveBeenCalledWith('team1')
  })

  it('filters docs by query (case-insensitive)', async () => {
    const docs = [
      { id: 'd1', name: 'Design Spec', workspace_id: 1 },
      { id: 'd2', name: 'API Guide', workspace_id: 1 },
    ]
    mockGetDocs.mockResolvedValue(docs)
    const { listDocs } = await import('../../../src/commands/docs.js')
    const result = await listDocs(mockConfig, 'design')
    expect(result).toEqual([docs[0]])
  })

  it('returns empty array when no docs match query', async () => {
    mockGetDocs.mockResolvedValue([{ id: 'd1', name: 'Design Spec', workspace_id: 1 }])
    const { listDocs } = await import('../../../src/commands/docs.js')
    const result = await listDocs(mockConfig, 'nonexistent')
    expect(result).toEqual([])
  })
})

describe('formatDocs', () => {
  it('returns "No docs found" for empty array', async () => {
    const { formatDocs } = await import('../../../src/commands/docs.js')
    expect(formatDocs([])).toBe('No docs found')
  })

  it('formats docs with names and IDs', async () => {
    const { formatDocs } = await import('../../../src/commands/docs.js')
    const result = formatDocs([{ id: 'd1', name: 'My Doc', workspace_id: 1 }])
    expect(result).toContain('My Doc')
    expect(result).toContain('d1')
  })
})

describe('formatDocsMarkdown', () => {
  it('returns "No docs found" for empty array', async () => {
    const { formatDocsMarkdown } = await import('../../../src/commands/docs.js')
    expect(formatDocsMarkdown([])).toBe('No docs found')
  })

  it('formats docs as markdown list', async () => {
    const { formatDocsMarkdown } = await import('../../../src/commands/docs.js')
    const result = formatDocsMarkdown([
      { id: 'd1', name: 'My Doc', workspace_id: 1 },
      { id: 'd2', name: 'Other Doc', workspace_id: 1 },
    ])
    expect(result).toBe('- **My Doc** (d1)\n- **Other Doc** (d2)')
  })
})
