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
    vi.mocked(loadConfig).mockImplementation(() => { throw new Error('not found') })

    const { runListsCommand } = await import('./lists.js')
    await expect(runListsCommand()).rejects.toThrow('cu init first')
  })

  it('writes updated config with selected lists', async () => {
    const { loadConfig, writeConfig } = await import('../config.js')
    vi.mocked(loadConfig).mockReturnValue({ apiToken: 'pk_t', lists: ['l1'] })

    const { selectLists } = await import('./select-lists.js')
    vi.mocked(selectLists).mockResolvedValue(['l1', 'l2', 'l3'])

    const { runListsCommand } = await import('./lists.js')
    await runListsCommand()

    expect(vi.mocked(writeConfig)).toHaveBeenCalledWith({ apiToken: 'pk_t', lists: ['l1', 'l2', 'l3'] })
  })

  it('preserves existing token when updating lists', async () => {
    const { loadConfig, writeConfig } = await import('../config.js')
    vi.mocked(loadConfig).mockReturnValue({ apiToken: 'pk_original', lists: ['l1'] })

    const { selectLists } = await import('./select-lists.js')
    vi.mocked(selectLists).mockResolvedValue(['l2'])

    const { runListsCommand } = await import('./lists.js')
    await runListsCommand()

    const written = vi.mocked(writeConfig).mock.calls[0][0]
    expect(written.apiToken).toBe('pk_original')
  })
})
