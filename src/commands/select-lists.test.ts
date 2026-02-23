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
      getLists: vi.fn().mockResolvedValue([{ id: 'l1', name: 'Sprint 1' }, { id: 'l2', name: 'Backlog' }])
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { fetchAllLists } = await import('./select-lists.js')
    const client = new ClickUpClient({ apiToken: 'pk_t' })
    const result = await fetchAllLists(client)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ teamName: 'Acme', spaceName: 'Engineering', listId: 'l1', listName: 'Sprint 1' })
  })

  it('returns empty array when no teams found', async () => {
    const { ClickUpClient } = await import('../api.js')
    vi.mocked(ClickUpClient).mockImplementation(() => ({
      getTeams: vi.fn().mockResolvedValue([]),
      getSpaces: vi.fn(),
      getLists: vi.fn()
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { fetchAllLists } = await import('./select-lists.js')
    const client = new ClickUpClient({ apiToken: 'pk_t' })
    const result = await fetchAllLists(client)
    expect(result).toHaveLength(0)
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
      getLists: vi.fn().mockResolvedValue([{ id: 'l1', name: 'Sprint 1' }, { id: 'l2', name: 'Backlog' }])
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
      getLists: vi.fn().mockResolvedValue([{ id: 'l1', name: 'Sprint 1' }])
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
      getLists: vi.fn().mockResolvedValue([])
    }) as unknown as InstanceType<typeof ClickUpClient>)

    const { selectLists } = await import('./select-lists.js')
    const client = new ClickUpClient({ apiToken: 'pk_t' })
    await expect(selectLists(client, [])).rejects.toThrow('No lists found')
  })
})
