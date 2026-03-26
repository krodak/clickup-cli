import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDeleteView = vi.fn().mockResolvedValue(undefined)
const mockGetView = vi.fn().mockResolvedValue({ id: 'v1', name: 'My Board', type: 'board' })

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      deleteView: mockDeleteView,
      getView: mockGetView,
    }
  }),
}))

vi.mock('../../../src/output.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../../src/output.js')>('../../../src/output.js')
  return {
    ...actual,
    isTTY: vi.fn().mockReturnValue(false),
  }
})

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn().mockResolvedValue(false),
}))

const config = { apiToken: 'pk_test', teamId: 'tm_1' }

describe('deleteViewCommand', () => {
  beforeEach(async () => {
    mockDeleteView.mockClear()
    mockGetView.mockClear()
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(false)
    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockReset().mockResolvedValue(false)
  })

  it('deletes a view with --confirm flag', async () => {
    const { deleteViewCommand } = await import('../../../src/commands/view-delete.js')
    const result = await deleteViewCommand(config, 'v1', { confirm: true })
    expect(mockDeleteView).toHaveBeenCalledWith('v1')
    expect(result).toEqual({ viewId: 'v1', deleted: true })
  })

  it('does not fetch view when --confirm is set', async () => {
    const { deleteViewCommand } = await import('../../../src/commands/view-delete.js')
    await deleteViewCommand(config, 'v1', { confirm: true })
    expect(mockGetView).not.toHaveBeenCalled()
  })

  it('throws when non-TTY and --confirm not provided', async () => {
    const { deleteViewCommand } = await import('../../../src/commands/view-delete.js')
    await expect(deleteViewCommand(config, 'v1', {})).rejects.toThrow(
      'requires --confirm flag in non-interactive mode',
    )
    expect(mockDeleteView).not.toHaveBeenCalled()
  })

  it('throws Cancelled when user declines confirmation', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const { deleteViewCommand } = await import('../../../src/commands/view-delete.js')
    await expect(deleteViewCommand(config, 'v1', {})).rejects.toThrow('Cancelled')
    expect(mockDeleteView).not.toHaveBeenCalled()
  })

  it('fetches view name for confirmation prompt when TTY and no --confirm', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    const { deleteViewCommand } = await import('../../../src/commands/view-delete.js')
    await deleteViewCommand(config, 'v1', {})
    expect(mockGetView).toHaveBeenCalledWith('v1')
    expect(mockDeleteView).toHaveBeenCalledWith('v1')
  })

  it('shows correct confirmation message with view name', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    const { deleteViewCommand } = await import('../../../src/commands/view-delete.js')
    await deleteViewCommand(config, 'v1', {})
    expect(prompts.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Delete view "My Board" (v1)? This cannot be undone.',
      }),
    )
  })
})
