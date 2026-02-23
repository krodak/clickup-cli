import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api.js', () => ({ ClickUpClient: vi.fn() }))
vi.mock('../config.js', () => ({
  loadConfig: vi.fn(),
  writeConfig: vi.fn()
}))
vi.mock('./select-lists.js', () => ({ selectLists: vi.fn() }))

describe('runListsCommand', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
  })

  it('throws when config does not exist', async () => {
    const { loadConfig } = await import('../config.js')
    vi.mocked(loadConfig).mockImplementation(() => { throw new Error('Config file not found') })

    const { runListsCommand } = await import('./lists.js')
    await expect(runListsCommand()).rejects.toThrow('cu init first')
  })

  it('propagates non-file-not-found errors from loadConfig', async () => {
    const { loadConfig } = await import('../config.js')
    vi.mocked(loadConfig).mockImplementation(() => { throw new Error('invalid JSON') })

    const { runListsCommand } = await import('./lists.js')
    await expect(runListsCommand()).rejects.toThrow('invalid JSON')
  })

  it('outputs selected lists count', async () => {
    const { loadConfig } = await import('../config.js')
    vi.mocked(loadConfig).mockReturnValue({ apiToken: 'pk_t', teamId: 'team_1' })

    const { selectLists } = await import('./select-lists.js')
    vi.mocked(selectLists).mockResolvedValue(['l1', 'l2', 'l3'])

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const { runListsCommand } = await import('./lists.js')
    await runListsCommand()
    writeSpy.mockRestore()

    expect(vi.mocked(selectLists)).toHaveBeenCalledWith(expect.anything(), [])
  })

  it('passes empty array as current lists to selectLists', async () => {
    const { loadConfig } = await import('../config.js')
    vi.mocked(loadConfig).mockReturnValue({ apiToken: 'pk_original', teamId: 'team_1' })

    const { selectLists } = await import('./select-lists.js')
    vi.mocked(selectLists).mockResolvedValue(['l2'])

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const { runListsCommand } = await import('./lists.js')
    await runListsCommand()
    writeSpy.mockRestore()

    expect(vi.mocked(selectLists)).toHaveBeenCalledWith(expect.anything(), [])
  })
})
