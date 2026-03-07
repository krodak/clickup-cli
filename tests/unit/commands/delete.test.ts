import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDeleteTask = vi.fn().mockResolvedValue(undefined)
const mockGetTask = vi.fn().mockResolvedValue({ id: 'abc123', name: 'My Task' })

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    deleteTask: mockDeleteTask,
    getTask: mockGetTask,
  })),
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

describe('deleteTaskCommand', () => {
  beforeEach(async () => {
    mockDeleteTask.mockClear()
    mockGetTask.mockClear()
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(false)
    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockReset().mockResolvedValue(false)
  })

  it('deletes a task with --confirm flag', async () => {
    const { deleteTaskCommand } = await import('../../../src/commands/delete.js')
    const result = await deleteTaskCommand(config, 'abc123', { confirm: true })
    expect(mockDeleteTask).toHaveBeenCalledWith('abc123')
    expect(result).toEqual({ taskId: 'abc123', deleted: true })
  })

  it('does not fetch task when --confirm is set', async () => {
    const { deleteTaskCommand } = await import('../../../src/commands/delete.js')
    await deleteTaskCommand(config, 'abc123', { confirm: true })
    expect(mockGetTask).not.toHaveBeenCalled()
  })

  it('throws when non-TTY and --confirm not provided', async () => {
    const { deleteTaskCommand } = await import('../../../src/commands/delete.js')
    await expect(deleteTaskCommand(config, 'abc123', {})).rejects.toThrow(
      'requires --confirm flag in non-interactive mode',
    )
    expect(mockDeleteTask).not.toHaveBeenCalled()
  })

  it('throws Cancelled when user declines confirmation', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const { deleteTaskCommand } = await import('../../../src/commands/delete.js')
    await expect(deleteTaskCommand(config, 'abc123', {})).rejects.toThrow('Cancelled')
    expect(mockDeleteTask).not.toHaveBeenCalled()
  })

  it('fetches task name for confirmation prompt when TTY and no --confirm', async () => {
    const outputMod = await import('../../../src/output.js')
    vi.mocked(outputMod.isTTY).mockReturnValue(true)

    const prompts = await import('@inquirer/prompts')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    const { deleteTaskCommand } = await import('../../../src/commands/delete.js')
    await deleteTaskCommand(config, 'abc123', {})
    expect(mockGetTask).toHaveBeenCalledWith('abc123')
    expect(mockDeleteTask).toHaveBeenCalledWith('abc123')
  })
})
