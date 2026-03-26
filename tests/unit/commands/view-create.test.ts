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

  it('creates a view with valid type', async () => {
    const created = { id: 'v1', name: 'My Board', type: 'board' }
    mockCreateListView.mockResolvedValue(created)
    const { createView } = await import('../../../src/commands/view-create.js')
    const result = await createView(mockConfig, 'list1', 'My Board', { type: 'board' })
    expect(result).toEqual(created)
    expect(mockCreateListView).toHaveBeenCalledWith('list1', { name: 'My Board', type: 'board' })
  })

  it('creates a view with group-by', async () => {
    const created = { id: 'v2', name: 'Status Board', type: 'board' }
    mockCreateListView.mockResolvedValue(created)
    const { createView } = await import('../../../src/commands/view-create.js')
    await createView(mockConfig, 'list1', 'Status Board', {
      type: 'board',
      groupBy: 'status',
    })
    expect(mockCreateListView).toHaveBeenCalledWith('list1', {
      name: 'Status Board',
      type: 'board',
      grouping: { field: 'status' },
    })
  })

  it('throws for invalid view type', async () => {
    const { createView } = await import('../../../src/commands/view-create.js')
    await expect(createView(mockConfig, 'list1', 'Bad', { type: 'invalid' })).rejects.toThrow(
      'Invalid view type',
    )
  })

  it('throws for invalid group-by field', async () => {
    const { createView } = await import('../../../src/commands/view-create.js')
    await expect(
      createView(mockConfig, 'list1', 'Test', { type: 'board', groupBy: 'invalid' }),
    ).rejects.toThrow('Invalid group-by field')
  })

  it('throws for empty name', async () => {
    const { createView } = await import('../../../src/commands/view-create.js')
    await expect(createView(mockConfig, 'list1', '  ', { type: 'board' })).rejects.toThrow(
      'name cannot be empty',
    )
  })
})
