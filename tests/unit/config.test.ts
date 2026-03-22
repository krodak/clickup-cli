import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import type { MultiProfileConfig } from '../../src/config.js'

vi.mock('fs')

const savedEnv: Record<string, string | undefined> = {}

function clearConfigEnv() {
  for (const key of ['CU_API_TOKEN', 'CU_TEAM_ID', 'CU_PROFILE', 'XDG_CONFIG_HOME']) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
}

function restoreConfigEnv() {
  for (const key of ['CU_API_TOKEN', 'CU_TEAM_ID', 'CU_PROFILE', 'XDG_CONFIG_HOME']) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
}

function parseWrittenConfig(call: unknown[]): MultiProfileConfig {
  return JSON.parse(String(call[1])) as MultiProfileConfig
}

function multiProfileConfig(
  profiles: Record<string, Record<string, unknown>>,
  defaultProfile: string,
) {
  return JSON.stringify({ defaultProfile, profiles })
}

describe('loadConfig', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.resetModules()
    clearConfigEnv()
  })

  afterEach(() => {
    restoreConfigEnv()
  })

  it('throws with path hint when config file does not exist and no env vars', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('apiToken')
  })

  it('throws on invalid JSON', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('{ bad json }')
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('invalid JSON')
  })

  it('throws when config JSON root is not an object', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(['pk_test', 'team_1']))
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('must contain a JSON object')
  })

  it('throws when apiToken is not a string in old format', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 123, teamId: 'team_1' }))
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('unrecognized format')
  })

  it('throws when teamId is not a string in old format', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_test', teamId: 42 }))
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('teamId')
  })

  it('throws when sprintFolderId is not a string in old format', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ apiToken: 'pk_test', teamId: 'team_1', sprintFolderId: false }),
    )
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('sprintFolderId must be a string')
  })

  it('throws when apiToken is missing from old format', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ teamId: 'team_1' }))
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('unrecognized format')
  })

  it('throws when apiToken does not start with pk_ without leaking token', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ apiToken: 'sk_secret_value_here', teamId: 'team_1' }),
    )
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('pk_')
    try {
      loadConfig()
    } catch (e) {
      const msg = (e as Error).message
      expect(msg).not.toContain('sk_secret')
      expect(msg).not.toContain('secret_value')
    }
  })

  it('trims whitespace from apiToken before pk_ check', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ apiToken: '  pk_trimmed  ', teamId: 'team_1' }),
    )
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.apiToken).toBe('pk_trimmed')
  })

  it('throws when teamId is missing in old format', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_x' }))
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('teamId')
  })

  it('throws when teamId is empty string in old format', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_x', teamId: '' }))
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('teamId')
  })

  it('loads valid config from old format', async () => {
    const mockConfig = { apiToken: 'pk_test123', teamId: 'team_456' }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig))
    const { loadConfig } = await import('../../src/config.js')
    expect(loadConfig()).toEqual(mockConfig)
  })

  it('does not include lists field in returned config', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ apiToken: 'pk_abc', teamId: 'team_1', lists: ['l1'] }),
    )
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config).not.toHaveProperty('lists')
  })

  it('loads sprintFolderId when present in old format config file', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ apiToken: 'pk_abc', teamId: 'team_1', sprintFolderId: 'folder_123' }),
    )
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.sprintFolderId).toBe('folder_123')
  })

  it('omits sprintFolderId when not present in old format config file', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ apiToken: 'pk_abc', teamId: 'team_1' }),
    )
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.sprintFolderId).toBeUndefined()
  })

  it('trims sprintFolderId whitespace', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ apiToken: 'pk_abc', teamId: 'team_1', sprintFolderId: '  folder_123  ' }),
    )
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.sprintFolderId).toBe('folder_123')
  })

  it('uses CU_API_TOKEN env var over config file', async () => {
    process.env.CU_API_TOKEN = 'pk_env_token'
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ work: { apiToken: 'pk_file_token', teamId: 'team_1' } }, 'work'),
    )
    vi.resetModules()
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.apiToken).toBe('pk_env_token')
  })

  it('uses CU_TEAM_ID env var over config file', async () => {
    process.env.CU_TEAM_ID = 'env_team'
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ work: { apiToken: 'pk_test', teamId: 'file_team' } }, 'work'),
    )
    vi.resetModules()
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.teamId).toBe('env_team')
  })

  it('loads config entirely from env vars without config file', async () => {
    process.env.CU_API_TOKEN = 'pk_full_env'
    process.env.CU_TEAM_ID = 'team_env'
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.resetModules()
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.apiToken).toBe('pk_full_env')
    expect(config.teamId).toBe('team_env')
  })

  it('respects XDG_CONFIG_HOME for config path', async () => {
    process.env.XDG_CONFIG_HOME = '/tmp/custom-config'
    vi.resetModules()
    const { getConfigPath } = await import('../../src/config.js')
    expect(getConfigPath()).toBe('/tmp/custom-config/cup/config.json')
  })
})

describe('loadConfig multi-profile', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.resetModules()
    clearConfigEnv()
  })

  afterEach(() => {
    restoreConfigEnv()
  })

  it('loads from multi-profile config format', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.apiToken).toBe('pk_work')
    expect(config.teamId).toBe('team_w')
  })

  it('selects profile by explicit name', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig('personal')
    expect(config.apiToken).toBe('pk_personal')
    expect(config.teamId).toBe('team_p')
  })

  it('selects profile from CU_PROFILE env var', async () => {
    process.env.CU_PROFILE = 'personal'
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    vi.resetModules()
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.apiToken).toBe('pk_personal')
  })

  it('explicit profile name takes priority over CU_PROFILE env', async () => {
    process.env.CU_PROFILE = 'personal'
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    vi.resetModules()
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig('work')
    expect(config.apiToken).toBe('pk_work')
  })

  it('throws when profile not found with available profiles listed', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig('nonexistent')).toThrow('Profile "nonexistent" not found')
    expect(() => loadConfig('nonexistent')).toThrow('Available: work, personal')
  })

  it('auto-migrates old flat config to multi-profile format', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ apiToken: 'pk_old', teamId: 'team_old', sprintFolderId: 'folder_1' }),
    )
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.apiToken).toBe('pk_old')
    expect(config.teamId).toBe('team_old')
    expect(config.sprintFolderId).toBe('folder_1')
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled()
    const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const written = parseWrittenConfig(writeCall)
    expect(written.defaultProfile).toBe('default')
    expect(written.profiles.default?.apiToken).toBe('pk_old')
  })

  it('loads sprintFolderId from multi-profile config', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        { work: { apiToken: 'pk_work', teamId: 'team_w', sprintFolderId: 'folder_x' } },
        'work',
      ),
    )
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(config.sprintFolderId).toBe('folder_x')
  })
})

describe('loadRawConfig', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.resetModules()
    clearConfigEnv()
  })

  afterEach(() => {
    restoreConfigEnv()
  })

  it('throws when config JSON root is not an object', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(['pk_test', 'team_1']))
    const { loadRawConfig } = await import('../../src/config.js')
    expect(() => loadRawConfig()).toThrow('must contain a JSON object')
  })

  it('loads from active profile in multi-profile config', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { loadRawConfig } = await import('../../src/config.js')
    const raw = loadRawConfig()
    expect(raw.apiToken).toBe('pk_work')
    expect(raw.teamId).toBe('team_w')
  })

  it('loads from specified profile in multi-profile config', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { loadRawConfig } = await import('../../src/config.js')
    const raw = loadRawConfig('personal')
    expect(raw.apiToken).toBe('pk_personal')
  })
})

describe('writeConfig', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.resetModules()
    clearConfigEnv()
  })

  afterEach(() => {
    restoreConfigEnv()
  })

  it('creates config directory if it does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_test', teamId: 'team_1' })
    const expectedDir = path.join(os.homedir(), '.config', 'cup')
    expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(expectedDir, {
      recursive: true,
      mode: 0o700,
    })
  })

  it('writes config in multi-profile format', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_test', teamId: 'team_1' })
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.profiles.default).toEqual({ apiToken: 'pk_test', teamId: 'team_1' })
    expect(parsed.defaultProfile).toBe('default')
    expect(call[2]).toEqual({ encoding: 'utf-8', mode: 0o600 })
  })

  it('persists sprintFolderId when present', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_test', teamId: 'team_1', sprintFolderId: 'folder_x' })
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.profiles.default).toEqual({
      apiToken: 'pk_test',
      teamId: 'team_1',
      sprintFolderId: 'folder_x',
    })
  })

  it('trims required strings before writing config', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: '  pk_test  ', teamId: '  team_1  ' })
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.profiles.default).toEqual({ apiToken: 'pk_test', teamId: 'team_1' })
  })

  it('drops blank sprintFolderId when writing config', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_test', teamId: 'team_1', sprintFolderId: '   ' })
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.profiles.default).toEqual({ apiToken: 'pk_test', teamId: 'team_1' })
  })

  it('omits blank required values instead of persisting empty-string sentinels', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_test', teamId: '   ' })
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.profiles.default).toEqual({ apiToken: 'pk_test' })
  })

  it('trims sprintFolderId before writing when non-blank', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_test', teamId: 'team_1', sprintFolderId: '  folder_x  ' })
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.profiles.default).toEqual({
      apiToken: 'pk_test',
      teamId: 'team_1',
      sprintFolderId: 'folder_x',
    })
  })

  it('writes to the active profile in existing multi-profile config', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_old', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_new', teamId: 'team_w' })
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.profiles.work?.apiToken).toBe('pk_new')
    expect(parsed.profiles.personal?.apiToken).toBe('pk_personal')
  })

  it('writes to a specific profile when profileName is given', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_updated' }, 'personal')
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.profiles.personal?.apiToken).toBe('pk_updated')
    expect(parsed.profiles.work?.apiToken).toBe('pk_work')
  })
})

describe('profile management', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.resetModules()
    clearConfigEnv()
  })

  afterEach(() => {
    restoreConfigEnv()
  })

  it('addProfile adds a new profile', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ work: { apiToken: 'pk_work', teamId: 'team_w' } }, 'work'),
    )
    const { addProfile } = await import('../../src/config.js')
    addProfile('personal', { apiToken: 'pk_p', teamId: 'team_p' })
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.profiles.personal).toEqual({ apiToken: 'pk_p', teamId: 'team_p' })
    expect(parsed.profiles.work).toEqual({ apiToken: 'pk_work', teamId: 'team_w' })
  })

  it('addProfile sets defaultProfile if none exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { addProfile } = await import('../../src/config.js')
    addProfile('first', { apiToken: 'pk_first', teamId: 'team_f' })
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.defaultProfile).toBe('first')
  })

  it('removeProfile removes a profile', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { removeProfile } = await import('../../src/config.js')
    removeProfile('personal')
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.profiles.personal).toBeUndefined()
    expect(parsed.profiles.work).toBeDefined()
  })

  it('removeProfile refuses to remove the last profile', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ work: { apiToken: 'pk_work', teamId: 'team_w' } }, 'work'),
    )
    const { removeProfile } = await import('../../src/config.js')
    expect(() => removeProfile('work')).toThrow('Cannot remove the last profile')
  })

  it('removeProfile throws when profile not found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ work: { apiToken: 'pk_work', teamId: 'team_w' } }, 'work'),
    )
    const { removeProfile } = await import('../../src/config.js')
    expect(() => removeProfile('nonexistent')).toThrow('Profile "nonexistent" not found')
  })

  it('removeProfile updates defaultProfile when removing the current default', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { removeProfile } = await import('../../src/config.js')
    removeProfile('work')
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.defaultProfile).toBe('personal')
  })

  it('setDefaultProfile sets the default', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { setDefaultProfile } = await import('../../src/config.js')
    setDefaultProfile('personal')
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const parsed = parseWrittenConfig(call)
    expect(parsed.defaultProfile).toBe('personal')
  })

  it('setDefaultProfile throws when profile not found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ work: { apiToken: 'pk_work', teamId: 'team_w' } }, 'work'),
    )
    const { setDefaultProfile } = await import('../../src/config.js')
    expect(() => setDefaultProfile('nonexistent')).toThrow('Profile "nonexistent" not found')
    expect(() => setDefaultProfile('nonexistent')).toThrow('Available: work')
  })

  it('listProfiles returns all profiles with default marker', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig(
        {
          work: { apiToken: 'pk_work', teamId: 'team_w' },
          personal: { apiToken: 'pk_personal', teamId: 'team_p' },
        },
        'work',
      ),
    )
    const { listProfiles } = await import('../../src/config.js')
    const profiles = listProfiles()
    expect(profiles).toEqual([
      { name: 'work', isDefault: true, teamId: 'team_w' },
      { name: 'personal', isDefault: false, teamId: 'team_p' },
    ])
  })

  it('listProfiles returns empty array when no config', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { listProfiles } = await import('../../src/config.js')
    expect(listProfiles()).toEqual([])
  })
})

describe('migrateFromLegacy', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.mocked(fs.copyFileSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
    vi.resetModules()
    clearConfigEnv()
  })

  afterEach(() => {
    restoreConfigEnv()
  })

  it('copies legacy config when cu/ exists and cup/ does not', async () => {
    const legacyPath = path.join(os.homedir(), '.config', 'cu', 'config.json')
    const newPath = path.join(os.homedir(), '.config', 'cup', 'config.json')
    const newDir = path.join(os.homedir(), '.config', 'cup')
    let migrated = false
    vi.mocked(fs.copyFileSync).mockImplementation(() => {
      migrated = true
    })
    vi.mocked(fs.existsSync).mockImplementation(p => {
      if (String(p) === legacyPath) return true
      if (String(p) === newPath) return migrated
      if (String(p) === newDir) return migrated
      return false
    })
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ apiToken: 'pk_migrated', teamId: 'team_m' }),
    )
    const { loadConfig } = await import('../../src/config.js')
    const config = loadConfig()
    expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(newDir, { recursive: true, mode: 0o700 })
    expect(vi.mocked(fs.copyFileSync)).toHaveBeenCalledWith(legacyPath, newPath)
    expect(config.apiToken).toBe('pk_migrated')
  })

  it('does not migrate when cup/config.json already exists', async () => {
    const legacyPath = path.join(os.homedir(), '.config', 'cu', 'config.json')
    const newPath = path.join(os.homedir(), '.config', 'cup', 'config.json')
    vi.mocked(fs.existsSync).mockImplementation(p => {
      if (String(p) === legacyPath) return true
      if (String(p) === newPath) return true
      return true
    })
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ default: { apiToken: 'pk_existing', teamId: 'team_e' } }, 'default'),
    )
    const { loadConfig } = await import('../../src/config.js')
    loadConfig()
    expect(vi.mocked(fs.copyFileSync)).not.toHaveBeenCalled()
  })

  it('does not migrate when legacy config does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { loadRawConfig } = await import('../../src/config.js')
    loadRawConfig()
    expect(vi.mocked(fs.copyFileSync)).not.toHaveBeenCalled()
  })
})
