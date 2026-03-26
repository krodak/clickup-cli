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

describe('updateViewCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates view name', async () => {
    const view = { id: 'v1', name: 'Renamed', type: 'board' }
    mockUpdateView.mockResolvedValue(view)
    const { updateViewCommand } = await import('../../../src/commands/view-update.js')
    const result = await updateViewCommand(mockConfig, 'v1', { name: 'Renamed' })
    expect(result).toEqual(view)
    expect(mockUpdateView).toHaveBeenCalledWith('v1', { name: 'Renamed' })
  })

  it('updates view grouping', async () => {
    const view = { id: 'v1', name: 'Board', type: 'board' }
    mockUpdateView.mockResolvedValue(view)
    const { updateViewCommand } = await import('../../../src/commands/view-update.js')
    await updateViewCommand(mockConfig, 'v1', { groupBy: 'priority' })
    expect(mockUpdateView).toHaveBeenCalledWith('v1', {
      grouping: { field: 'priority', dir: 1, collapsed: [], ignore: false },
    })
  })

  it('throws when no options provided', async () => {
    const { updateViewCommand } = await import('../../../src/commands/view-update.js')
    await expect(updateViewCommand(mockConfig, 'v1', {})).rejects.toThrow(
      'Provide at least one option',
    )
  })
})
