import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

vi.mock('fs')

const savedEnv: Record<string, string | undefined> = {}

function clearConfigEnv() {
  for (const key of ['CU_API_TOKEN', 'CU_TEAM_ID', 'XDG_CONFIG_HOME']) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
}

function restoreConfigEnv() {
  for (const key of ['CU_API_TOKEN', 'CU_TEAM_ID', 'XDG_CONFIG_HOME']) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
}

describe('loadConfig', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
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

  it('throws when apiToken is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ teamId: 'team_1' }))
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('apiToken')
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

  it('throws when teamId is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_x' }))
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('teamId')
  })

  it('throws when teamId is empty string', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_x', teamId: '' }))
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('teamId')
  })

  it('loads valid config with teamId', async () => {
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

  it('uses CU_API_TOKEN env var over config file', async () => {
    process.env.CU_API_TOKEN = 'pk_env_token'
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ apiToken: 'pk_file_token', teamId: 'team_1' }),
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
      JSON.stringify({ apiToken: 'pk_test', teamId: 'file_team' }),
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
    expect(getConfigPath()).toBe('/tmp/custom-config/cu/config.json')
  })
})

describe('writeConfig', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
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
    const expectedDir = path.join(os.homedir(), '.config', 'cu')
    expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(expectedDir, {
      recursive: true,
      mode: 0o700,
    })
  })

  it('writes config as formatted JSON with restricted permissions', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_test', teamId: 'team_1' })
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledTimes(1)
    const call = vi.mocked(fs.writeFileSync).mock.calls[0]!
    const written = String(call[1])
    const parsed = JSON.parse(written)
    expect(parsed).toEqual({ apiToken: 'pk_test', teamId: 'team_1' })
    expect(call[2]).toEqual({ encoding: 'utf-8', mode: 0o600 })
    expect(vi.mocked(fs.mkdirSync)).not.toHaveBeenCalled()
  })
})
