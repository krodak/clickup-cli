import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetListViews = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getListViews: mockGetListViews,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleViews = {
  views: [{ id: 'v1', name: 'Table', type: 'table' }],
  required_views: {
    board: { id: 'v2', name: 'Board', type: 'board' },
    list: null,
  },
}

describe('listViews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all views including required views', async () => {
    mockGetListViews.mockResolvedValue(sampleViews)
    const { listViews } = await import('../../../src/commands/views.js')
    const result = await listViews(mockConfig, 'list_1')
    expect(result).toEqual([
      { id: 'v1', name: 'Table', type: 'table' },
      { id: 'v2', name: 'Board', type: 'board' },
    ])
  })

  it('handles empty views', async () => {
    mockGetListViews.mockResolvedValue({ views: [], required_views: {} })
    const { listViews } = await import('../../../src/commands/views.js')
    const result = await listViews(mockConfig, 'list_1')
    expect(result).toEqual([])
  })
})

describe('formatViews', () => {
  it('returns "No views found" for empty array', async () => {
    const { formatViews } = await import('../../../src/commands/views.js')
    expect(formatViews([])).toBe('No views found')
  })

  it('formats views with name, id, and type', async () => {
    const { formatViews } = await import('../../../src/commands/views.js')
    const result = formatViews([{ id: 'v1', name: 'Board', type: 'board' }])
    expect(result).toContain('Board')
    expect(result).toContain('v1')
    expect(result).toContain('board')
  })
})

describe('formatViewsMarkdown', () => {
  it('returns "No views found" for empty array', async () => {
    const { formatViewsMarkdown } = await import('../../../src/commands/views.js')
    expect(formatViewsMarkdown([])).toBe('No views found')
  })

  it('formats views as markdown list', async () => {
    const { formatViewsMarkdown } = await import('../../../src/commands/views.js')
    const result = formatViewsMarkdown([
      { id: 'v1', name: 'Board', type: 'board' },
      { id: 'v2', name: 'Table', type: 'table' },
    ])
    expect(result).toBe('- **Board** (v1) — board\n- **Table** (v2) — table')
  })
})
