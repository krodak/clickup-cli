import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetListCustomFields = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getListCustomFields: mockGetListCustomFields,
  })),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleFields = [
  {
    id: 'f1',
    name: 'Priority Level',
    type: 'drop_down',
    required: true,
    type_config: {
      options: [
        { id: '1', name: 'Low', orderindex: 0 },
        { id: '2', name: 'High', orderindex: 1 },
      ],
    },
  },
  { id: 'f2', name: 'Notes', type: 'text', required: false },
]

describe('listFields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns fields from API', async () => {
    mockGetListCustomFields.mockResolvedValue(sampleFields)
    const { listFields } = await import('../../../src/commands/fields.js')
    const result = await listFields(mockConfig, 'list1')
    expect(result).toEqual(sampleFields)
    expect(mockGetListCustomFields).toHaveBeenCalledWith('list1')
  })
})

describe('formatFields', () => {
  it('returns "No custom fields" for empty array', async () => {
    const { formatFields } = await import('../../../src/commands/fields.js')
    expect(formatFields([])).toBe('No custom fields')
  })

  it('formats fields with name, type, and options', async () => {
    const { formatFields } = await import('../../../src/commands/fields.js')
    const result = formatFields(sampleFields)
    expect(result).toContain('Priority Level')
    expect(result).toContain('Notes')
    expect(result).toContain('Low')
    expect(result).toContain('High')
  })
})

describe('formatFieldsMarkdown', () => {
  it('returns "No custom fields" for empty array', async () => {
    const { formatFieldsMarkdown } = await import('../../../src/commands/fields.js')
    expect(formatFieldsMarkdown([])).toBe('No custom fields')
  })

  it('formats fields as markdown list', async () => {
    const { formatFieldsMarkdown } = await import('../../../src/commands/fields.js')
    const result = formatFieldsMarkdown(sampleFields)
    expect(result).toContain('- **Priority Level** (drop_down) - required [Low, High]')
    expect(result).toContain('- **Notes** (text)')
  })
})
