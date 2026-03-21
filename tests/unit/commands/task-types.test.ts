import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCustomTaskTypes = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getCustomTaskTypes: mockGetCustomTaskTypes,
  })),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleTypes = [
  { id: 0, name: 'Task' },
  { id: 1, name: 'Initiative' },
  { id: 2, name: 'Bug' },
]

describe('listTaskTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns task types from API', async () => {
    mockGetCustomTaskTypes.mockResolvedValue(sampleTypes)
    const { listTaskTypes } = await import('../../../src/commands/task-types.js')
    const result = await listTaskTypes(mockConfig)
    expect(result).toEqual(sampleTypes)
    expect(mockGetCustomTaskTypes).toHaveBeenCalledWith('team1')
  })
})

describe('formatTaskTypes', () => {
  it('returns "No custom task types" for empty array', async () => {
    const { formatTaskTypes } = await import('../../../src/commands/task-types.js')
    expect(formatTaskTypes([])).toBe('No custom task types')
  })

  it('formats task types with name and id', async () => {
    const { formatTaskTypes } = await import('../../../src/commands/task-types.js')
    const result = formatTaskTypes(sampleTypes)
    expect(result).toContain('Task')
    expect(result).toContain('Initiative')
    expect(result).toContain('Bug')
  })
})

describe('formatTaskTypesMarkdown', () => {
  it('returns "No custom task types" for empty array', async () => {
    const { formatTaskTypesMarkdown } = await import('../../../src/commands/task-types.js')
    expect(formatTaskTypesMarkdown([])).toBe('No custom task types')
  })

  it('formats task types as markdown list', async () => {
    const { formatTaskTypesMarkdown } = await import('../../../src/commands/task-types.js')
    const result = formatTaskTypesMarkdown(sampleTypes)
    expect(result).toBe('- **Task** (0)\n- **Initiative** (1)\n- **Bug** (2)')
  })
})
