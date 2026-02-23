import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs'

vi.mock('fs')

describe('loadConfig', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.resetModules()
  })

  it('throws with path hint when config file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('Config file not found')
  })

  it('returns parsed config when file exists', async () => {
    const mockConfig = { apiToken: 'pk_test123', teamId: 'team_456', lists: ['list_1', 'list_2'] }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig))
    const { loadConfig } = await import('./config.js')
    expect(loadConfig()).toEqual(mockConfig)
  })

  it('returns config without teamId when omitted', async () => {
    const mockConfig = { apiToken: 'pk_abc', lists: ['list_1'] }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig))
    const { loadConfig } = await import('./config.js')
    const config = loadConfig()
    expect(config.apiToken).toBe('pk_abc')
    expect(config.teamId).toBeUndefined()
  })

  it('throws when apiToken is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ lists: ['list_1'] }))
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('apiToken')
  })

  it('throws when apiToken does not start with pk_', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'wrongtoken', lists: ['list_1'] }))
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('pk_')
  })

  it('trims whitespace from apiToken before pk_ check', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: '  pk_trimmed  ', lists: ['list_1'] }))
    const { loadConfig } = await import('./config.js')
    const config = loadConfig()
    expect(config.apiToken).toBe('pk_trimmed')
  })

  it('does not throw when teamId is omitted', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_x', lists: ['list_1'] }))
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).not.toThrow()
  })

  it('throws when lists is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_x' }))
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('lists')
  })

  it('throws when lists is empty array', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_x', lists: [] }))
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('lists')
  })

  it('throws on invalid JSON', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('{ bad json }')
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('invalid JSON')
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
    const { writeConfig } = await import('./config.js')
    writeConfig({ apiToken: 'pk_test', lists: ['l1'] })
    expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(
      expect.stringContaining('cu'),
      { recursive: true }
    )
  })

  it('writes config as formatted JSON', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const { writeConfig } = await import('./config.js')
    writeConfig({ apiToken: 'pk_test', lists: ['l1', 'l2'] })
    const written = String(vi.mocked(fs.writeFileSync).mock.calls[0][1])
    const parsed = JSON.parse(written)
    expect(parsed).toEqual({ apiToken: 'pk_test', lists: ['l1', 'l2'] })
  })
})
