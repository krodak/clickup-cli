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
  { id: 'tmpl1', name: 'Engineering Sprint Folder' },
  { id: 'tmpl2', name: 'Quarter Planning Folder' },
]

describe('listFolderTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns templates from API', async () => {
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
    expect(result).toContain('Engineering Sprint Folder')
    expect(result).toContain('Quarter Planning Folder')
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
    expect(result).toBe(
      '- **Engineering Sprint Folder** (tmpl1)\n- **Quarter Planning Folder** (tmpl2)',
    )
  })
})
