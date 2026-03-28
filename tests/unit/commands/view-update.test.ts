import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUpdateView = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      updateView: mockUpdateView,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('updateView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates view name', async () => {
    const updated = { id: 'v1', name: 'New Name', type: 'board' }
    mockUpdateView.mockResolvedValue(updated)
    const { updateView } = await import('../../../src/commands/view-update.js')
    const result = await updateView(mockConfig, 'v1', { name: 'New Name' })
    expect(result).toEqual(updated)
    expect(mockUpdateView).toHaveBeenCalledWith('v1', { name: 'New Name' })
  })

  it('updates view grouping', async () => {
    const updated = { id: 'v1', name: 'Board', type: 'board' }
    mockUpdateView.mockResolvedValue(updated)
    const { updateView } = await import('../../../src/commands/view-update.js')
    await updateView(mockConfig, 'v1', { groupBy: 'assignee' })
    expect(mockUpdateView).toHaveBeenCalledWith('v1', {
      grouping: { field: 'assignee' },
    })
  })

  it('throws for invalid group-by field', async () => {
    const { updateView } = await import('../../../src/commands/view-update.js')
    await expect(updateView(mockConfig, 'v1', { groupBy: 'invalid' })).rejects.toThrow(
      'Invalid group-by field',
    )
  })

  it('throws for empty name', async () => {
    const { updateView } = await import('../../../src/commands/view-update.js')
    await expect(updateView(mockConfig, 'v1', { name: '  ' })).rejects.toThrow(
      'name cannot be empty',
    )
  })

  it('throws when no options provided', async () => {
    const { updateView } = await import('../../../src/commands/view-update.js')
    await expect(updateView(mockConfig, 'v1', {})).rejects.toThrow('Provide at least one of')
  })
})
