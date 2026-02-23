import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@inquirer/prompts', () => ({
  password: vi.fn(),
  confirm: vi.fn()
}))
vi.mock('../api.js', () => ({ ClickUpClient: vi.fn() }))
vi.mock('../config.js', () => ({
  getConfigPath: vi.fn().mockReturnValue('/fake/.config/cu/config.json'),
  writeConfig: vi.fn()
}))
vi.mock('./select-lists.js', () => ({ selectLists: vi.fn() }))
vi.mock('fs')

describe('runInitCommand', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
  })

  it('aborts without writing if user declines overwrite', async () => {
    const fs = await import('fs')
    vi.mocked(fs.existsSync).mockReturnValue(true)

    const { confirm } = await import('@inquirer/prompts')
    vi.mocked(confirm).mockResolvedValue(false)

    const { writeConfig } = await import('../config.js')
    const { runInitCommand } = await import('./init.js')
    await runInitCommand()

    expect(vi.mocked(writeConfig)).not.toHaveBeenCalled()
  })

  it('throws when token does not start with pk_', async () => {
    const fs = await import('fs')
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const { password } = await import('@inquirer/prompts')
    vi.mocked(password).mockResolvedValue('wrongtoken')

    const { runInitCommand } = await import('./init.js')
    await expect(runInitCommand()).rejects.toThrow('pk_')
  })

  it('throws when API rejects the token', async () => {
    const fs = await import('fs')
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const { password } = await import('@inquirer/prompts')
    vi.mocked(password).mockResolvedValue('pk_invalid')

    const { ClickUpClient } = await import('../api.js')
    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getMe: vi.fn().mockRejectedValue(new Error('ClickUp API error 401: invalid token'))
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { runInitCommand } = await import('./init.js')
    await expect(runInitCommand()).rejects.toThrow('Invalid token')
  })

  it('writes config after successful flow', async () => {
    const fs = await import('fs')
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const { password, confirm } = await import('@inquirer/prompts')
    vi.mocked(password).mockResolvedValue('pk_valid123')

    const { ClickUpClient } = await import('../api.js')
    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getMe: vi.fn().mockResolvedValue({ id: 1, username: 'krzysztof' })
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { selectLists } = await import('./select-lists.js')
    vi.mocked(selectLists).mockResolvedValue(['l1', 'l2'])

    const { writeConfig } = await import('../config.js')
    const { runInitCommand } = await import('./init.js')
    await runInitCommand()

    expect(vi.mocked(writeConfig)).toHaveBeenCalledWith({
      apiToken: 'pk_valid123',
      teamId: 'l1'
    })
    expect(vi.mocked(confirm)).not.toHaveBeenCalled()
  })

  it('proceeds with full flow when user confirms overwrite', async () => {
    const fs = await import('fs')
    vi.mocked(fs.existsSync).mockReturnValue(true)

    const { confirm, password } = await import('@inquirer/prompts')
    vi.mocked(confirm).mockResolvedValue(true)
    vi.mocked(password).mockResolvedValue('pk_valid123')

    const { ClickUpClient } = await import('../api.js')
    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getMe: vi.fn().mockResolvedValue({ id: 1, username: 'krzysztof' })
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { selectLists } = await import('./select-lists.js')
    vi.mocked(selectLists).mockResolvedValue(['l1'])

    const { writeConfig } = await import('../config.js')
    const { runInitCommand } = await import('./init.js')
    await runInitCommand()

    expect(vi.mocked(writeConfig)).toHaveBeenCalledWith({ apiToken: 'pk_valid123', teamId: 'l1' })
  })
})
