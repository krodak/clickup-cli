import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDeleteSpace = vi.fn().mockResolvedValue(undefined)
const mockGetSpaceWithStatuses = vi
  .fn()
  .mockResolvedValue({ id: 's1', name: 'My Space', statuses: [] })

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      deleteSpace: mockDeleteSpace,
      getSpaceWithStatuses: mockGetSpaceWithStatuses,
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

describe('deleteSpaceCommand', () => {
  beforeEach(async () => {
    mockDeleteSpace.mockClear()
    mockGetSpaceWithStatuses.mockClear()
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(false)
    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockReset().mockResolvedValue(false)
  })

  it('deletes a space with --confirm flag', async () => {
    const { deleteSpaceCommand } = await import('../../../src/commands/space-delete.js')
    const result = await deleteSpaceCommand(config, 's1', { confirm: true })
    expect(mockDeleteSpace).toHaveBeenCalledWith('s1')
    expect(result).toEqual({ spaceId: 's1', deleted: true })
  })

  it('does not fetch space when --confirm is set', async () => {
    const { deleteSpaceCommand } = await import('../../../src/commands/space-delete.js')
    await deleteSpaceCommand(config, 's1', { confirm: true })
    expect(mockGetSpaceWithStatuses).not.toHaveBeenCalled()
  })

  it('throws when non-TTY and --confirm not provided', async () => {
    const { deleteSpaceCommand } = await import('../../../src/commands/space-delete.js')
    await expect(deleteSpaceCommand(config, 's1', {})).rejects.toThrow(
      'requires --confirm flag in non-interactive mode',
    )
    expect(mockDeleteSpace).not.toHaveBeenCalled()
  })

  it('throws Cancelled when user declines confirmation', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const { deleteSpaceCommand } = await import('../../../src/commands/space-delete.js')
    await expect(deleteSpaceCommand(config, 's1', {})).rejects.toThrow('Cancelled')
    expect(mockDeleteSpace).not.toHaveBeenCalled()
  })

  it('fetches space name for confirmation prompt when TTY and no --confirm', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    const { deleteSpaceCommand } = await import('../../../src/commands/space-delete.js')
    await deleteSpaceCommand(config, 's1', {})
    expect(mockGetSpaceWithStatuses).toHaveBeenCalledWith('s1')
    expect(mockDeleteSpace).toHaveBeenCalledWith('s1')
  })

  it('shows correct confirmation message with space name', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    const { deleteSpaceCommand } = await import('../../../src/commands/space-delete.js')
    await deleteSpaceCommand(config, 's1', {})
    expect(prompts.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Delete space "My Space" (s1)? This cannot be undone.',
      }),
    )
  })
})
