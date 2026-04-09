import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getMe: mockGetMe,
      getTeams: mockGetTeams,
    }
  }),
}))

vi.mock('../../../src/config.js', () => ({
  getConfigPath: vi.fn().mockReturnValue('/mock/config.json'),
  writeConfig: mockWriteConfig,
}))

vi.mock('fs', async importOriginal => {
  const actual = await importOriginal<typeof import('fs')>()
  const mod = actual as Record<string, unknown>
  return {
    ...actual,
    default: {
      ...(mod['default'] as Record<string, unknown>),
      existsSync: mockExistsSync,
    },
  }
})

describe('runInitCommand', () => {
  const originalIsTTY = process.stdin.isTTY

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMe.mockResolvedValue({ id: 1, username: 'testuser' })
    mockGetTeams.mockResolvedValue([{ id: 'team1', name: 'My Workspace' }])
    mockPassword.mockResolvedValue('pk_testtoken')
    mockExistsSync.mockReturnValue(false)
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      configurable: true,
    })
  })

  it('writes config with apiToken and teamId when single workspace', async () => {
    const { runInitCommand } = await import('../../../src/commands/init.js')
    await runInitCommand()
    expect(mockWriteConfig).toHaveBeenCalledWith({
      apiToken: 'pk_testtoken',
      teamId: 'team1',
    })
  })

  it('outputs authenticated message', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const { runInitCommand } = await import('../../../src/commands/init.js')
    await runInitCommand()
    const output = writeSpy.mock.calls.map(c => c[0]).join('')
    expect(output).toContain('@testuser')
    writeSpy.mockRestore()
  })

  it('throws when token does not start with pk_', async () => {
    mockPassword.mockResolvedValue('invalid_token')
    const { runInitCommand } = await import('../../../src/commands/init.js')
    await expect(runInitCommand()).rejects.toThrow('pk_')
  })

  it('aborts when config exists and user declines overwrite', async () => {
    mockExistsSync.mockReturnValue(true)
    mockConfirm.mockResolvedValue(false)
    const { runInitCommand } = await import('../../../src/commands/init.js')
    await runInitCommand()
    expect(mockWriteConfig).not.toHaveBeenCalled()
  })

  it('shows workspace selector when multiple teams exist', async () => {
    mockGetTeams.mockResolvedValue([
      { id: 'team1', name: 'Workspace A' },
      { id: 'team2', name: 'Workspace B' },
    ])
    mockSelect.mockResolvedValue('team2')
    const { runInitCommand } = await import('../../../src/commands/init.js')
    await runInitCommand()
    expect(mockSelect).toHaveBeenCalled()
    expect(mockWriteConfig).toHaveBeenCalledWith(expect.objectContaining({ teamId: 'team2' }))
  })

  it('throws when no workspaces found', async () => {
    mockGetTeams.mockResolvedValue([])
    const { runInitCommand } = await import('../../../src/commands/init.js')
    await expect(runInitCommand()).rejects.toThrow('No workspaces')
  })

  it('shows API token help intro in interactive mode', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const { runInitCommand } = await import('../../../src/commands/init.js')
    await runInitCommand()
    const output = writeSpy.mock.calls.map(c => c[0]).join('')
    expect(output).toContain('Welcome to ClickUp CLI')
    expect(output).toContain('https://app.clickup.com/settings/apps')
    expect(output).toContain('API Token')
    writeSpy.mockRestore()
  })

  it('shows next-steps hint after successful config write', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const { runInitCommand } = await import('../../../src/commands/init.js')
    await runInitCommand()
    const output = writeSpy.mock.calls.map(c => c[0]).join('')
    expect(output).toContain('Next steps')
    expect(output).toContain('cup auth')
    writeSpy.mockRestore()
  })

  it('throws with non-TTY help when stdin is not a terminal', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true })
    const { runInitCommand } = await import('../../../src/commands/init.js')
    await expect(runInitCommand()).rejects.toThrow('cup init --token')
  })

  it('invalid token error includes token URL', async () => {
    mockPassword.mockResolvedValue('nottoken')
    const { runInitCommand } = await import('../../../src/commands/init.js')
    await expect(runInitCommand()).rejects.toThrow('app.clickup.com/settings/apps')
  })

  describe('non-interactive mode', () => {
    it('writes config with --token and --team without prompts', async () => {
      const { runInitCommand } = await import('../../../src/commands/init.js')
      await runInitCommand({ token: 'pk_testtoken', team: 'team123' })
      expect(mockWriteConfig).toHaveBeenCalledWith({
        apiToken: 'pk_testtoken',
        teamId: 'team123',
      })
      expect(mockPassword).not.toHaveBeenCalled()
      expect(mockConfirm).not.toHaveBeenCalled()
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('throws when only --token is provided', async () => {
      const { runInitCommand } = await import('../../../src/commands/init.js')
      await expect(runInitCommand({ token: 'pk_testtoken' })).rejects.toThrow(
        'Both --token and --team are required for non-interactive setup',
      )
    })

    it('throws when only --team is provided', async () => {
      const { runInitCommand } = await import('../../../src/commands/init.js')
      await expect(runInitCommand({ team: 'team123' })).rejects.toThrow(
        'Both --token and --team are required for non-interactive setup',
      )
    })

    it('validates token starts with pk_ in non-interactive mode', async () => {
      const { runInitCommand } = await import('../../../src/commands/init.js')
      await expect(runInitCommand({ token: 'invalid_token', team: 'team123' })).rejects.toThrow(
        'pk_',
      )
    })

    it('verifies token against API in non-interactive mode', async () => {
      mockGetMe.mockRejectedValue(new Error('Unauthorized'))
      const { runInitCommand } = await import('../../../src/commands/init.js')
      await expect(runInitCommand({ token: 'pk_badtoken', team: 'team123' })).rejects.toThrow(
        'Token verification failed',
      )
    })
  })
})
