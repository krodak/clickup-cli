import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs'

vi.mock('fs')

describe('loadConfig', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
  })

  it('throws with helpful message when config file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('Config file not found')
  })

  it('returns parsed config when file exists', async () => {
    const mockConfig = {
      apiToken: 'pk_test123',
      teamId: 'team_456',
      lists: ['list_1', 'list_2']
    }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig))
    const { loadConfig } = await import('./config.js')
    expect(loadConfig()).toEqual(mockConfig)
  })

  it('throws when apiToken is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ teamId: 'team_456', lists: ['list_1'] }))
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('apiToken')
  })

  it('throws when teamId is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_test123', lists: ['list_1'] }))
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('teamId')
  })

  it('throws when lists is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_test123', teamId: 'team_456' }))
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('lists')
  })

  it('throws when lists is an empty array', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiToken: 'pk_test123', teamId: 'team_456', lists: [] }))
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('lists')
  })

  it('throws on invalid JSON', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('{ not valid json }')
    const { loadConfig } = await import('./config.js')
    expect(() => loadConfig()).toThrow('invalid JSON')
  })
})
