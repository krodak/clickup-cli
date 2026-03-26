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
  name: 'Board View',
  type: 'board',
  visibility: 'everyone',
  date_created: '1700000000000',
  protected: false,
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
  it('includes view name and type', async () => {
    const { formatView } = await import('../../../src/commands/view.js')
    const result = formatView(sampleView)
    expect(result).toContain('Board View')
    expect(result).toContain('board')
  })
})

describe('formatViewMarkdown', () => {
  it('formats view as markdown', async () => {
    const { formatViewMarkdown } = await import('../../../src/commands/view.js')
    const result = formatViewMarkdown(sampleView)
    expect(result).toContain('# Board View')
    expect(result).toContain('**ID:** v1')
    expect(result).toContain('**Type:** board')
    expect(result).toContain('**Visibility:** everyone')
  })
})
