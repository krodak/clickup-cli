import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSharedHierarchy = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getSharedHierarchy: mockGetSharedHierarchy,
    }
  }),
}))

const mockIsTTY = vi.fn<() => boolean>()

vi.mock('../../../src/output.js', async importOriginal => {
  const orig = await importOriginal<typeof import('../../../src/output.js')>()
  return {
    ...orig,
    isTTY: (...args: Parameters<typeof orig.isTTY>) => mockIsTTY(...args),
  }
})

const config = { apiToken: 'pk_test', teamId: 'tm_1' }

const sampleHierarchy = {
  shared: {
    spaces: [{ id: 's1', name: 'Space One' }],
    folders: [
      { id: 'f1', name: 'Folder One' },
      { id: 'f2', name: 'Folder Two' },
    ],
    lists: [{ id: 'l1', name: 'List One' }],
  },
}

describe('fetchSharedHierarchy', () => {
  beforeEach(() => {
    mockGetSharedHierarchy.mockReset()
  })

  it('returns shared hierarchy from API', async () => {
    mockGetSharedHierarchy.mockResolvedValue(sampleHierarchy)
    const { fetchSharedHierarchy } = await import('../../../src/commands/shared.js')
    const result = await fetchSharedHierarchy(config)
    expect(result).toEqual(sampleHierarchy)
    expect(mockGetSharedHierarchy).toHaveBeenCalledOnce()
  })
})

describe('formatSharedHierarchy', () => {
  it('formats hierarchy as TTY output with sections', async () => {
    const { formatSharedHierarchy } = await import('../../../src/commands/shared.js')
    const output = formatSharedHierarchy(sampleHierarchy)
    expect(output).toContain('Space One')
    expect(output).toContain('Folder One')
    expect(output).toContain('List One')
    expect(output).toContain('s1')
  })

  it('handles empty hierarchy', async () => {
    const { formatSharedHierarchy } = await import('../../../src/commands/shared.js')
    const output = formatSharedHierarchy({
      shared: { spaces: [], folders: [], lists: [] },
    })
    expect(output).toContain('No shared items')
  })
})

describe('formatSharedHierarchyMarkdown', () => {
  it('formats hierarchy as markdown', async () => {
    const { formatSharedHierarchyMarkdown } = await import('../../../src/commands/shared.js')
    const output = formatSharedHierarchyMarkdown(sampleHierarchy)
    expect(output).toContain('# Shared')
    expect(output).toContain('Space One')
    expect(output).toContain('Folder One')
    expect(output).toContain('List One')
  })

  it('handles empty hierarchy in markdown', async () => {
    const { formatSharedHierarchyMarkdown } = await import('../../../src/commands/shared.js')
    const output = formatSharedHierarchyMarkdown({
      shared: { spaces: [], folders: [], lists: [] },
    })
    expect(output).toContain('No shared items')
  })
})
