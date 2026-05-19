import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDeleteFolder = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      deleteFolder: mockDeleteFolder,
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

describe('deleteFolderCommand', () => {
  beforeEach(async () => {
    mockDeleteFolder.mockClear()
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(false)
    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockReset().mockResolvedValue(false)
  })

  it('deletes a folder with --confirm flag', async () => {
    const { deleteFolderCommand } = await import('../../../src/commands/folder-delete.js')
    const result = await deleteFolderCommand(config, 'f1', { confirm: true })
    expect(mockDeleteFolder).toHaveBeenCalledWith('f1')
    expect(result).toEqual({ folderId: 'f1', deleted: true })
  })

  it('throws when non-TTY and --confirm not provided', async () => {
    const { deleteFolderCommand } = await import('../../../src/commands/folder-delete.js')
    await expect(deleteFolderCommand(config, 'f1', {})).rejects.toThrow(
      'requires --confirm flag in non-interactive mode',
    )
    expect(mockDeleteFolder).not.toHaveBeenCalled()
  })

  it('throws Cancelled when user declines confirmation', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const { deleteFolderCommand } = await import('../../../src/commands/folder-delete.js')
    await expect(deleteFolderCommand(config, 'f1', {})).rejects.toThrow('Cancelled')
    expect(mockDeleteFolder).not.toHaveBeenCalled()
  })

  it('deletes folder when user confirms in TTY mode', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    const { deleteFolderCommand } = await import('../../../src/commands/folder-delete.js')
    await deleteFolderCommand(config, 'f1', {})
    expect(mockDeleteFolder).toHaveBeenCalledWith('f1')
  })

  it('shows folder ID in confirmation message', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    const { deleteFolderCommand } = await import('../../../src/commands/folder-delete.js')
    await deleteFolderCommand(config, 'f1', {})
    expect(prompts.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Delete folder f1? This cannot be undone.',
      }),
    )
  })
})
