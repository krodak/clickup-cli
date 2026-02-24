import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLoadRawConfig = vi.fn()
const mockWriteConfig = vi.fn()
const mockGetConfigPath = vi.fn().mockReturnValue('/mock/.config/cu/config.json')

vi.mock('../../../src/config.js', () => ({
  loadRawConfig: mockLoadRawConfig,
  writeConfig: mockWriteConfig,
  getConfigPath: mockGetConfigPath,
}))

describe('config commands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadRawConfig.mockReturnValue({})
  })

  describe('getConfigValue', () => {
    it('returns undefined when config is empty', async () => {
      const { getConfigValue } = await import('../../../src/commands/config.js')
      expect(getConfigValue('apiToken')).toBeUndefined()
    })

    it('returns apiToken value from raw config', async () => {
      mockLoadRawConfig.mockReturnValue({ apiToken: 'pk_abc123' })
      const { getConfigValue } = await import('../../../src/commands/config.js')
      expect(getConfigValue('apiToken')).toBe('pk_abc123')
    })

    it('returns teamId value from raw config', async () => {
      mockLoadRawConfig.mockReturnValue({ teamId: 'team_1' })
      const { getConfigValue } = await import('../../../src/commands/config.js')
      expect(getConfigValue('teamId')).toBe('team_1')
    })

    it('trims whitespace from values', async () => {
      mockLoadRawConfig.mockReturnValue({ apiToken: '  pk_abc123  ' })
      const { getConfigValue } = await import('../../../src/commands/config.js')
      expect(getConfigValue('apiToken')).toBe('pk_abc123')
    })

    it('returns undefined for empty string value', async () => {
      mockLoadRawConfig.mockReturnValue({ apiToken: '' })
      const { getConfigValue } = await import('../../../src/commands/config.js')
      expect(getConfigValue('apiToken')).toBeUndefined()
    })

    it('returns undefined for whitespace-only value', async () => {
      mockLoadRawConfig.mockReturnValue({ teamId: '   ' })
      const { getConfigValue } = await import('../../../src/commands/config.js')
      expect(getConfigValue('teamId')).toBeUndefined()
    })

    it('throws for unknown key', async () => {
      const { getConfigValue } = await import('../../../src/commands/config.js')
      expect(() => getConfigValue('badKey')).toThrow('Unknown config key')
    })
  })

  describe('setConfigValue', () => {
    it('writes apiToken to config', async () => {
      mockLoadRawConfig.mockReturnValue({ teamId: 'team_1' })
      const { setConfigValue } = await import('../../../src/commands/config.js')
      setConfigValue('apiToken', 'pk_newtoken')
      expect(mockWriteConfig).toHaveBeenCalledWith({
        apiToken: 'pk_newtoken',
        teamId: 'team_1',
      })
    })

    it('writes teamId to config', async () => {
      mockLoadRawConfig.mockReturnValue({ apiToken: 'pk_existing' })
      const { setConfigValue } = await import('../../../src/commands/config.js')
      setConfigValue('teamId', 'new_team')
      expect(mockWriteConfig).toHaveBeenCalledWith({
        apiToken: 'pk_existing',
        teamId: 'new_team',
      })
    })

    it('merges with existing config', async () => {
      mockLoadRawConfig.mockReturnValue({ apiToken: 'pk_old', teamId: 'team_old' })
      const { setConfigValue } = await import('../../../src/commands/config.js')
      setConfigValue('teamId', 'team_new')
      expect(mockWriteConfig).toHaveBeenCalledWith({
        apiToken: 'pk_old',
        teamId: 'team_new',
      })
    })

    it('writes to empty config', async () => {
      mockLoadRawConfig.mockReturnValue({})
      const { setConfigValue } = await import('../../../src/commands/config.js')
      setConfigValue('apiToken', 'pk_first')
      expect(mockWriteConfig).toHaveBeenCalledWith({
        apiToken: 'pk_first',
        teamId: '',
      })
    })

    it('throws when apiToken does not start with pk_', async () => {
      const { setConfigValue } = await import('../../../src/commands/config.js')
      expect(() => setConfigValue('apiToken', 'bad_token')).toThrow('apiToken must start with pk_')
    })

    it('throws when teamId is empty', async () => {
      const { setConfigValue } = await import('../../../src/commands/config.js')
      expect(() => setConfigValue('teamId', '')).toThrow('teamId must be non-empty')
    })

    it('throws when teamId is whitespace only', async () => {
      const { setConfigValue } = await import('../../../src/commands/config.js')
      expect(() => setConfigValue('teamId', '   ')).toThrow('teamId must be non-empty')
    })

    it('throws for unknown key', async () => {
      const { setConfigValue } = await import('../../../src/commands/config.js')
      expect(() => setConfigValue('unknown', 'val')).toThrow('Unknown config key')
    })
  })

  describe('configPath', () => {
    it('returns the config file path', async () => {
      const { configPath } = await import('../../../src/commands/config.js')
      expect(configPath()).toBe('/mock/.config/cu/config.json')
    })
  })
})
