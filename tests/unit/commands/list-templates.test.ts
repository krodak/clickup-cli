import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetListTemplates = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getListTemplates: mockGetListTemplates,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleTemplates = [
  { id: 'tmpl1', name: 'Sprint Board' },
  { id: 'tmpl2', name: 'Team Backlog' },
]

describe('listListTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns templates from API', async () => {
    mockGetListTemplates.mockResolvedValue(sampleTemplates)
    const { listListTemplates } = await import('../../../src/commands/list-templates.js')
    const result = await listListTemplates(mockConfig)
    expect(result).toEqual(sampleTemplates)
    expect(mockGetListTemplates).toHaveBeenCalledWith('team1')
  })
})

describe('formatListTemplates', () => {
  it('returns "No list templates" for empty array', async () => {
    const { formatListTemplates } = await import('../../../src/commands/list-templates.js')
    expect(formatListTemplates([])).toBe('No list templates')
  })

  it('formats templates with name and id', async () => {
    const { formatListTemplates } = await import('../../../src/commands/list-templates.js')
    const result = formatListTemplates(sampleTemplates)
    expect(result).toContain('Sprint Board')
    expect(result).toContain('Team Backlog')
  })
})

describe('formatListTemplatesMarkdown', () => {
  it('returns "No list templates" for empty array', async () => {
    const { formatListTemplatesMarkdown } = await import('../../../src/commands/list-templates.js')
    expect(formatListTemplatesMarkdown([])).toBe('No list templates')
  })

  it('formats templates as markdown list', async () => {
    const { formatListTemplatesMarkdown } = await import('../../../src/commands/list-templates.js')
    const result = formatListTemplatesMarkdown(sampleTemplates)
    expect(result).toBe('- **Sprint Board** (tmpl1)\n- **Team Backlog** (tmpl2)')
  })
})
