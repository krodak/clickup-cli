import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetView = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getView: mockGetView,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleView = {
  id: 'v1',
  name: 'Board',
  type: 'board',
  visibility: 'public',
  grouping: { field: 'status', dir: 1 },
  settings: { show_subtasks: 1 },
}

describe('getView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns view from API', async () => {
    mockGetView.mockResolvedValue(sampleView)
    const { getView } = await import('../../../src/commands/view.js')
    const result = await getView(mockConfig, 'v1')
    expect(result).toEqual(sampleView)
    expect(mockGetView).toHaveBeenCalledWith('v1')
  })
})

describe('formatView', () => {
  it('includes name, type, and config', async () => {
    const { formatView } = await import('../../../src/commands/view.js')
    const result = formatView(sampleView)
    expect(result).toContain('Board')
    expect(result).toContain('board')
    expect(result).toContain('public')
  })
})

describe('formatViewMarkdown', () => {
  it('formats view as markdown with sections', async () => {
    const { formatViewMarkdown } = await import('../../../src/commands/view.js')
    const result = formatViewMarkdown(sampleView)
    expect(result).toContain('## Board')
    expect(result).toContain('**Type:** board')
    expect(result).toContain('### Grouping')
    expect(result).toContain('### Settings')
  })
})
