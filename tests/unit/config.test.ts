import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

vi.mock('fs')

describe('loadConfig', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.resetModules()
  })

  it('throws with path hint when config file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { loadConfig } = await import('../../src/config.js')
    expect(() => loadConfig()).toThrow('Config file not found')
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
})

describe('writeConfig', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
    vi.resetModules()
  })

  it('creates config directory if it does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_test', teamId: 'team_1' })
    const expectedDir = path.join(os.homedir(), '.config', 'cu')
    expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(expectedDir, { recursive: true })
  })

  it('writes config as formatted JSON', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const { writeConfig } = await import('../../src/config.js')
    writeConfig({ apiToken: 'pk_test', teamId: 'team_1' })
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledTimes(1)
    const written = String(vi.mocked(fs.writeFileSync).mock.calls[0]![1])
    const parsed = JSON.parse(written)
    expect(parsed).toEqual({ apiToken: 'pk_test', teamId: 'team_1' })
    expect(vi.mocked(fs.mkdirSync)).not.toHaveBeenCalled()
  })
})
