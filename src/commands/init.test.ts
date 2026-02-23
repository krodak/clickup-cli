import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPassword = vi.fn()
const mockConfirm = vi.fn()
const mockSelect = vi.fn()
const mockGetMe = vi.fn().mockResolvedValue({ id: 1, username: 'testuser' })
const mockGetTeams = vi.fn().mockResolvedValue([{ id: 'team1', name: 'My Workspace' }])
const mockWriteConfig = vi.fn()
const mockExistsSync = vi.fn().mockReturnValue(false)

vi.mock('@inquirer/prompts', () => ({
  password: mockPassword,
  confirm: mockConfirm,
  select: mockSelect,
}))

vi.mock('../api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMe: mockGetMe,
    getTeams: mockGetTeams
  }))
}))

vi.mock('../config.js', () => ({
  getConfigPath: vi.fn().mockReturnValue('/mock/config.json'),
  writeConfig: mockWriteConfig
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    default: {
      ...actual.default,
      existsSync: mockExistsSync,
    }
  }
})

describe('runInitCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMe.mockResolvedValue({ id: 1, username: 'testuser' })
    mockGetTeams.mockResolvedValue([{ id: 'team1', name: 'My Workspace' }])
    mockPassword.mockResolvedValue('pk_testtoken')
    mockExistsSync.mockReturnValue(false)
  })

  it('writes config with apiToken and teamId when single workspace', async () => {
    const { runInitCommand } = await import('./init.js')
    await runInitCommand()
    expect(mockWriteConfig).toHaveBeenCalledWith({
      apiToken: 'pk_testtoken',
      teamId: 'team1'
    })
  })

  it('outputs authenticated message', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const { runInitCommand } = await import('./init.js')
    await runInitCommand()
    const output = writeSpy.mock.calls.map(c => c[0]).join('')
    expect(output).toContain('@testuser')
    writeSpy.mockRestore()
  })

  it('throws when token does not start with pk_', async () => {
    mockPassword.mockResolvedValue('invalid_token')
    const { runInitCommand } = await import('./init.js')
    await expect(runInitCommand()).rejects.toThrow('pk_')
  })

  it('aborts when config exists and user declines overwrite', async () => {
    mockExistsSync.mockReturnValue(true)
    mockConfirm.mockResolvedValue(false)
    const { runInitCommand } = await import('./init.js')
    await runInitCommand()
    expect(mockWriteConfig).not.toHaveBeenCalled()
  })

  it('shows workspace selector when multiple teams exist', async () => {
    mockGetTeams.mockResolvedValue([
      { id: 'team1', name: 'Workspace A' },
      { id: 'team2', name: 'Workspace B' }
    ])
    mockSelect.mockResolvedValue('team2')
    const { runInitCommand } = await import('./init.js')
    await runInitCommand()
    expect(mockSelect).toHaveBeenCalled()
    expect(mockWriteConfig).toHaveBeenCalledWith(expect.objectContaining({ teamId: 'team2' }))
  })

  it('throws when no workspaces found', async () => {
    mockGetTeams.mockResolvedValue([])
    const { runInitCommand } = await import('./init.js')
    await expect(runInitCommand()).rejects.toThrow('No workspaces')
  })
})
