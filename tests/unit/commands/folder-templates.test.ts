import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetFolderTemplates = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getFolderTemplates: mockGetFolderTemplates,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleTemplates = [
  { id: 'ft1', name: 'Department' },
  { id: 'ft2', name: 'Project' },
]

describe('listFolderTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns folder templates from API', async () => {
    mockGetFolderTemplates.mockResolvedValue(sampleTemplates)
    const { listFolderTemplates } = await import('../../../src/commands/folder-templates.js')
    const result = await listFolderTemplates(mockConfig)
    expect(result).toEqual(sampleTemplates)
    expect(mockGetFolderTemplates).toHaveBeenCalledWith('team1')
  })
})

describe('formatFolderTemplates', () => {
  it('returns "No folder templates" for empty array', async () => {
    const { formatFolderTemplates } = await import('../../../src/commands/folder-templates.js')
    expect(formatFolderTemplates([])).toBe('No folder templates')
  })

  it('formats templates with name and id', async () => {
    const { formatFolderTemplates } = await import('../../../src/commands/folder-templates.js')
    const result = formatFolderTemplates(sampleTemplates)
    expect(result).toContain('Department')
    expect(result).toContain('Project')
  })
})

describe('formatFolderTemplatesMarkdown', () => {
  it('returns "No folder templates" for empty array', async () => {
    const { formatFolderTemplatesMarkdown } =
      await import('../../../src/commands/folder-templates.js')
    expect(formatFolderTemplatesMarkdown([])).toBe('No folder templates')
  })

  it('formats templates as markdown list', async () => {
    const { formatFolderTemplatesMarkdown } =
      await import('../../../src/commands/folder-templates.js')
    const result = formatFolderTemplatesMarkdown(sampleTemplates)
    expect(result).toBe('- **Department** (ft1)\n- **Project** (ft2)')
  })
})
