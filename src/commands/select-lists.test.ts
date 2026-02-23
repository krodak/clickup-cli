import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn()
}))

vi.mock('../api.js', () => ({
  ClickUpClient: vi.fn()
}))

describe('fetchAllLists', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns flat list of all lists across teams and spaces', async () => {
    const { ClickUpClient } = await import('../api.js')
    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getTeams: vi.fn().mockResolvedValue([{ id: 't1', name: 'Acme' }]),
      getSpaces: vi.fn().mockResolvedValue([{ id: 's1', name: 'Engineering' }]),
      getLists: vi.fn().mockResolvedValue([{ id: 'l1', name: 'Sprint 1' }, { id: 'l2', name: 'Backlog' }]),
      getFolders: vi.fn().mockResolvedValue([]),
      getFolderLists: vi.fn().mockResolvedValue([])
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { fetchAllLists } = await import('./select-lists.js')
    const client = new ClickUpClient({ apiToken: 'pk_t' })
    const result = await fetchAllLists(client)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ teamName: 'Acme', spaceName: 'Engineering', listId: 'l1', listName: 'Sprint 1' })
  })

  it('handles multiple teams and spaces', async () => {
    const { ClickUpClient } = await import('../api.js')
    const mockGetSpaces = vi.fn()
      .mockResolvedValueOnce([{ id: 's1', name: 'Space 1' }, { id: 's2', name: 'Space 2' }])
      .mockResolvedValueOnce([{ id: 's3', name: 'Space 3' }, { id: 's4', name: 'Space 4' }])
    const mockGetLists = vi.fn()
      .mockResolvedValueOnce([{ id: 'l1', name: 'List 1' }])
      .mockResolvedValueOnce([{ id: 'l2', name: 'List 2' }])
      .mockResolvedValueOnce([{ id: 'l3', name: 'List 3' }])
      .mockResolvedValueOnce([{ id: 'l4', name: 'List 4' }])

    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getTeams: vi.fn().mockResolvedValue([
        { id: 't1', name: 'Team 1' },
        { id: 't2', name: 'Team 2' }
      ]),
      getSpaces: mockGetSpaces,
      getLists: mockGetLists,
      getFolders: vi.fn().mockResolvedValue([]),
      getFolderLists: vi.fn().mockResolvedValue([])
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { fetchAllLists } = await import('./select-lists.js')
    const client = new ClickUpClient({ apiToken: 'pk_t' })
    const result = await fetchAllLists(client)

    expect(result).toHaveLength(4)
    expect(result.map(r => r.listId)).toEqual(expect.arrayContaining(['l1', 'l2', 'l3', 'l4']))
  })

  it('returns empty array when no teams found', async () => {
    const { ClickUpClient } = await import('../api.js')
    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getTeams: vi.fn().mockResolvedValue([]),
      getSpaces: vi.fn(),
      getLists: vi.fn(),
      getFolders: vi.fn().mockResolvedValue([]),
      getFolderLists: vi.fn().mockResolvedValue([])
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { fetchAllLists } = await import('./select-lists.js')
    const client = new ClickUpClient({ apiToken: 'pk_t' })
    const result = await fetchAllLists(client)
    expect(result).toHaveLength(0)
  })

  it('includes lists from folders alongside folderless lists', async () => {
    const { ClickUpClient } = await import('../api.js')
    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getTeams: vi.fn().mockResolvedValue([{ id: 't1', name: 'Acme' }]),
      getSpaces: vi.fn().mockResolvedValue([{ id: 's1', name: 'Engineering' }]),
      getLists: vi.fn().mockResolvedValue([{ id: 'l1', name: 'Folderless List' }]),
      getFolders: vi.fn().mockResolvedValue([{ id: 'f1', name: 'Q1 Work' }]),
      getFolderLists: vi.fn().mockResolvedValue([{ id: 'l2', name: 'In Folder List' }])
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { fetchAllLists } = await import('./select-lists.js')
    const client = new ClickUpClient({ apiToken: 'pk_t' })
    const result = await fetchAllLists(client)

    expect(result).toHaveLength(2)
    expect(result.map(r => r.listId)).toEqual(expect.arrayContaining(['l1', 'l2']))
  })
})

describe('selectLists', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('pre-checks currently configured lists', async () => {
    const { checkbox } = await import('@inquirer/prompts')
    vi.mocked(checkbox).mockResolvedValue(['l1'])

    const { ClickUpClient } = await import('../api.js')
    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getTeams: vi.fn().mockResolvedValue([{ id: 't1', name: 'Acme' }]),
      getSpaces: vi.fn().mockResolvedValue([{ id: 's1', name: 'Eng' }]),
      getLists: vi.fn().mockResolvedValue([{ id: 'l1', name: 'Sprint 1' }, { id: 'l2', name: 'Backlog' }]),
      getFolders: vi.fn().mockResolvedValue([]),
      getFolderLists: vi.fn().mockResolvedValue([])
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { selectLists } = await import('./select-lists.js')
    const client = new ClickUpClient({ apiToken: 'pk_t' })
    await selectLists(client, ['l1'])

    const callArg = vi.mocked(checkbox).mock.calls[0][0]
    const sprint = callArg.choices.find((c: { value: string }) => c.value === 'l1')
    const backlog = callArg.choices.find((c: { value: string }) => c.value === 'l2')
    expect(sprint.checked).toBe(true)
    expect(backlog.checked).toBe(false)
  })

  it('throws when no lists selected', async () => {
    const { checkbox } = await import('@inquirer/prompts')
    vi.mocked(checkbox).mockResolvedValue([])

    const { ClickUpClient } = await import('../api.js')
    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getTeams: vi.fn().mockResolvedValue([{ id: 't1', name: 'Acme' }]),
      getSpaces: vi.fn().mockResolvedValue([{ id: 's1', name: 'Eng' }]),
      getLists: vi.fn().mockResolvedValue([{ id: 'l1', name: 'Sprint 1' }]),
      getFolders: vi.fn().mockResolvedValue([]),
      getFolderLists: vi.fn().mockResolvedValue([])
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { selectLists } = await import('./select-lists.js')
    const client = new ClickUpClient({ apiToken: 'pk_t' })
    await expect(selectLists(client, [])).rejects.toThrow('No lists selected')
  })

  it('throws when workspace has no lists', async () => {
    const { ClickUpClient } = await import('../api.js')
    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getTeams: vi.fn().mockResolvedValue([{ id: 't1', name: 'Acme' }]),
      getSpaces: vi.fn().mockResolvedValue([{ id: 's1', name: 'Eng' }]),
      getLists: vi.fn().mockResolvedValue([]),
      getFolders: vi.fn().mockResolvedValue([]),
      getFolderLists: vi.fn().mockResolvedValue([])
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { selectLists } = await import('./select-lists.js')
    const client = new ClickUpClient({ apiToken: 'pk_t' })
    await expect(selectLists(client, [])).rejects.toThrow('No lists found')
  })
})
