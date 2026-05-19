import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMergeTasks = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      mergeTasks: mockMergeTasks,
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

describe('mergeCommand', () => {
  beforeEach(async () => {
    mockMergeTasks.mockClear()
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(false)
    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockReset().mockResolvedValue(false)
  })

  it('merges tasks with --confirm flag', async () => {
    const { mergeCommand } = await import('../../../src/commands/merge.js')
    const result = await mergeCommand(config, 'source1', 'target1', { confirm: true })
    expect(mockMergeTasks).toHaveBeenCalledWith('target1', ['source1'])
    expect(result).toEqual({ sourceTaskId: 'source1', intoTaskId: 'target1', merged: true })
  })

  it('throws when non-TTY and --confirm not provided', async () => {
    const { mergeCommand } = await import('../../../src/commands/merge.js')
    await expect(mergeCommand(config, 'source1', 'target1', {})).rejects.toThrow(
      'requires --confirm flag in non-interactive mode',
    )
    expect(mockMergeTasks).not.toHaveBeenCalled()
  })

  it('throws Cancelled when user declines confirmation', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const { mergeCommand } = await import('../../../src/commands/merge.js')
    await expect(mergeCommand(config, 'source1', 'target1', {})).rejects.toThrow('Cancelled')
    expect(mockMergeTasks).not.toHaveBeenCalled()
  })

  it('merges when user confirms in TTY mode', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)
    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    const { mergeCommand } = await import('../../../src/commands/merge.js')
    const result = await mergeCommand(config, 'source1', 'target1', {})
    expect(mockMergeTasks).toHaveBeenCalledWith('target1', ['source1'])
    expect(result).toEqual({ sourceTaskId: 'source1', intoTaskId: 'target1', merged: true })
  })
})
