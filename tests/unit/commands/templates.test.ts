import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetTaskTemplates = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getTaskTemplates: mockGetTaskTemplates,
  })),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleTemplates = [
  { id: 'tmpl1', name: 'Bug Report' },
  { id: 'tmpl2', name: 'Feature Request' },
]

describe('listTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns templates from API', async () => {
    mockGetTaskTemplates.mockResolvedValue(sampleTemplates)
    const { listTemplates } = await import('../../../src/commands/templates.js')
    const result = await listTemplates(mockConfig)
    expect(result).toEqual(sampleTemplates)
    expect(mockGetTaskTemplates).toHaveBeenCalledWith('team1')
  })
})

describe('formatTemplates', () => {
  it('returns "No task templates" for empty array', async () => {
    const { formatTemplates } = await import('../../../src/commands/templates.js')
    expect(formatTemplates([])).toBe('No task templates')
  })

  it('formats templates with name and id', async () => {
    const { formatTemplates } = await import('../../../src/commands/templates.js')
    const result = formatTemplates(sampleTemplates)
    expect(result).toContain('Bug Report')
    expect(result).toContain('Feature Request')
  })
})

describe('formatTemplatesMarkdown', () => {
  it('returns "No task templates" for empty array', async () => {
    const { formatTemplatesMarkdown } = await import('../../../src/commands/templates.js')
    expect(formatTemplatesMarkdown([])).toBe('No task templates')
  })

  it('formats templates as markdown list', async () => {
    const { formatTemplatesMarkdown } = await import('../../../src/commands/templates.js')
    const result = formatTemplatesMarkdown(sampleTemplates)
    expect(result).toBe('- **Bug Report** (tmpl1)\n- **Feature Request** (tmpl2)')
  })
})
