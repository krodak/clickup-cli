import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDeleteList = vi.fn().mockResolvedValue(undefined)
const mockGetListWithStatuses = vi
  .fn()
  .mockResolvedValue({ id: '123', name: 'My List', statuses: [] })

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      deleteList: mockDeleteList,
      getListWithStatuses: mockGetListWithStatuses,
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

describe('deleteListCommand', () => {
  beforeEach(async () => {
    mockDeleteList.mockClear()
    mockGetListWithStatuses.mockClear()
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(false)
    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockReset().mockResolvedValue(false)
  })

  it('deletes a list with --confirm flag', async () => {
    const { deleteListCommand } = await import('../../../src/commands/list-delete.js')
    const result = await deleteListCommand(config, '123', { confirm: true })
    expect(mockDeleteList).toHaveBeenCalledWith('123')
    expect(result).toEqual({ listId: '123', deleted: true })
  })

  it('does not fetch list when --confirm is set', async () => {
    const { deleteListCommand } = await import('../../../src/commands/list-delete.js')
    await deleteListCommand(config, '123', { confirm: true })
    expect(mockGetListWithStatuses).not.toHaveBeenCalled()
  })

  it('throws when non-TTY and --confirm not provided', async () => {
    const { deleteListCommand } = await import('../../../src/commands/list-delete.js')
    await expect(deleteListCommand(config, '123', {})).rejects.toThrow(
      'requires --confirm flag in non-interactive mode',
    )
    expect(mockDeleteList).not.toHaveBeenCalled()
  })

  it('throws Cancelled when user declines confirmation', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const { deleteListCommand } = await import('../../../src/commands/list-delete.js')
    await expect(deleteListCommand(config, '123', {})).rejects.toThrow('Cancelled')
    expect(mockDeleteList).not.toHaveBeenCalled()
  })

  it('fetches list name for confirmation prompt when TTY and no --confirm', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    const { deleteListCommand } = await import('../../../src/commands/list-delete.js')
    await deleteListCommand(config, '123', {})
    expect(mockGetListWithStatuses).toHaveBeenCalledWith('123')
    expect(mockDeleteList).toHaveBeenCalledWith('123')
  })

  it('shows correct confirmation message with list name', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    const { deleteListCommand } = await import('../../../src/commands/list-delete.js')
    await deleteListCommand(config, '123', {})
    expect(prompts.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Delete list "My List" (123)? This cannot be undone.',
      }),
    )
  })
})
