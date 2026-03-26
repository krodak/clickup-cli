import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateListView = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      createListView: mockCreateListView,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('createView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a view with name and type', async () => {
    const view = { id: 'v1', name: 'Board', type: 'board' }
    mockCreateListView.mockResolvedValue(view)
    const { createView } = await import('../../../src/commands/view-create.js')
    const result = await createView(mockConfig, 'list_1', 'Board', { type: 'board' })
    expect(result).toEqual(view)
    expect(mockCreateListView).toHaveBeenCalledWith('list_1', { name: 'Board', type: 'board' })
  })

  it('creates a view with groupBy option', async () => {
    const view = { id: 'v1', name: 'By Priority', type: 'table' }
    mockCreateListView.mockResolvedValue(view)
    const { createView } = await import('../../../src/commands/view-create.js')
    await createView(mockConfig, 'list_1', 'By Priority', { type: 'table', groupBy: 'priority' })
    expect(mockCreateListView).toHaveBeenCalledWith('list_1', {
      name: 'By Priority',
      type: 'table',
      grouping: { field: 'priority', dir: 1, collapsed: [], ignore: false },
    })
  })

  it('throws on empty name', async () => {
    const { createView } = await import('../../../src/commands/view-create.js')
    await expect(createView(mockConfig, 'list_1', '', { type: 'board' })).rejects.toThrow(
      'View name cannot be empty',
    )
  })

  it('throws on invalid view type', async () => {
    const { createView } = await import('../../../src/commands/view-create.js')
    await expect(
      createView(mockConfig, 'list_1', 'Test', { type: 'invalid' }),
    ).rejects.toThrow('Invalid view type')
  })
})
