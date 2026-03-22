import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockListProfiles = vi.fn()
const mockAddProfile = vi.fn()
const mockRemoveProfile = vi.fn()
const mockSetDefaultProfile = vi.fn()

vi.mock('../../../src/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ apiToken: 'pk_test', teamId: 'team_1' }),
  listProfiles: mockListProfiles,
  addProfile: mockAddProfile,
  removeProfile: mockRemoveProfile,
  setDefaultProfile: mockSetDefaultProfile,
}))

vi.mock('../../../src/output.js', () => ({
  shouldOutputJson: vi.fn().mockReturnValue(false),
  isTTY: vi.fn().mockReturnValue(false),
}))

describe('profile commands via buildProgram', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('profile list outputs profiles', async () => {
    mockListProfiles.mockReturnValue([
      { name: 'work', isDefault: true, teamId: 'team_w' },
      { name: 'personal', isDefault: false, teamId: 'team_p' },
    ])
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { buildProgram } = await import('../../../src/index.js')
    const program = buildProgram('cup')
    program.exitOverride()
    await program.parseAsync(['node', 'cup', 'profile', 'list'])
    expect(consoleSpy).toHaveBeenCalledWith('work (default) [team: team_w]')
    expect(consoleSpy).toHaveBeenCalledWith('personal [team: team_p]')
    consoleSpy.mockRestore()
  })

  it('profile list outputs empty message when no profiles', async () => {
    mockListProfiles.mockReturnValue([])
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { buildProgram } = await import('../../../src/index.js')
    const program = buildProgram('cup')
    program.exitOverride()
    await program.parseAsync(['node', 'cup', 'profile', 'list'])
    expect(consoleSpy).toHaveBeenCalledWith('No profiles configured. Run: cup profile add <name>')
    consoleSpy.mockRestore()
  })

  it('profile remove calls removeProfile', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { buildProgram } = await import('../../../src/index.js')
    const program = buildProgram('cup')
    program.exitOverride()
    await program.parseAsync(['node', 'cup', 'profile', 'remove', 'old'])
    expect(mockRemoveProfile).toHaveBeenCalledWith('old')
    expect(consoleSpy).toHaveBeenCalledWith('Removed profile "old"')
    consoleSpy.mockRestore()
  })

  it('profile use calls setDefaultProfile', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { buildProgram } = await import('../../../src/index.js')
    const program = buildProgram('cup')
    program.exitOverride()
    await program.parseAsync(['node', 'cup', 'profile', 'use', 'personal'])
    expect(mockSetDefaultProfile).toHaveBeenCalledWith('personal')
    expect(consoleSpy).toHaveBeenCalledWith('Default profile set to "personal"')
    consoleSpy.mockRestore()
  })
})
