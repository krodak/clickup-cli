import { describe, expect, it, vi } from 'vitest'
import { discoverUserTasks, resolveUserRef } from '../../../src/export/discover.js'

const members = [
  { id: 1, username: 'chris', email: 'chris@example.com' },
  { id: 2, username: 'alice', email: 'alice@example.com' },
]

function makeClient(tasks: Array<{ id: string; list: { id: string }; custom_item_id?: number }>) {
  return {
    getMe: vi.fn().mockResolvedValue({ id: 1, username: 'chris' }),
    getWorkspaceMembers: vi.fn().mockResolvedValue(members),
    getMyTasks: vi.fn().mockResolvedValue(tasks),
    getTeams: vi.fn().mockResolvedValue([{ id: 'ws1', name: 'krodak' }]),
  }
}

describe('resolveUserRef', () => {
  it('resolves "me" via getMe', async () => {
    const c = makeClient([])
    expect(await resolveUserRef(c as never, 'ws1', 'me')).toEqual({ id: 1, username: 'chris' })
  })

  it('accepts a numeric id and looks up the username', async () => {
    const c = makeClient([])
    expect(await resolveUserRef(c as never, 'ws1', '2')).toEqual({ id: 2, username: 'alice' })
  })

  it('resolves an email or username case-insensitively', async () => {
    const c = makeClient([])
    expect(await resolveUserRef(c as never, 'ws1', 'Alice@Example.com')).toEqual({
      id: 2,
      username: 'alice',
    })
    expect(await resolveUserRef(c as never, 'ws1', 'CHRIS')).toEqual({ id: 1, username: 'chris' })
  })

  it('fails with the available members listed', async () => {
    const c = makeClient([])
    await expect(resolveUserRef(c as never, 'ws1', 'nobody')).rejects.toThrow(
      /User "nobody" not found.*chris.*alice/,
    )
  })
})

describe('discoverUserTasks', () => {
  it('queries active and archived assigned tasks in two passes and unions them', async () => {
    // Verified against the API: archived=true returns ONLY archived tasks, so
    // a complete export needs both passes.
    const c = makeClient([])
    c.getMyTasks
      .mockResolvedValueOnce([
        { id: 't1', list: { id: 'l1' } },
        { id: 't2', list: { id: 'l2' }, custom_item_id: 1004 },
      ])
      .mockResolvedValueOnce([{ id: 'a1', list: { id: 'l1' } }])
    const plan = await discoverUserTasks(c, 'ws1', 'me')

    const base = { all: true, assignees: [1], includeClosed: true, subtasks: true }
    expect(c.getMyTasks).toHaveBeenNthCalledWith(1, 'ws1', base)
    expect(c.getMyTasks).toHaveBeenNthCalledWith(2, 'ws1', { ...base, archived: true })
    expect(plan.slice).toEqual({ name: 'user-chris', kind: 'user', scope: '1' })
    expect(plan.tasks).toEqual([
      { id: 't1', listId: 'l1', initiative: false },
      { id: 't2', listId: 'l2', initiative: true },
      { id: 'a1', listId: 'l1', initiative: false },
    ])
    expect(plan.workspace).toEqual({ id: 'ws1', name: 'krodak' })
  })

  it('dedupes a task that appears in both passes', async () => {
    const c = makeClient([])
    c.getMyTasks
      .mockResolvedValueOnce([{ id: 't1', list: { id: 'l1' } }])
      .mockResolvedValueOnce([{ id: 't1', list: { id: 'l1' } }])
    const plan = await discoverUserTasks(c, 'ws1', 'me')
    expect(plan.tasks.map(t => t.id)).toEqual(['t1'])
  })
})

describe('discoverTeamTasks', () => {
  function teamClient() {
    const tasksByList: Record<
      string,
      Array<{ id: string; list: { id: string }; custom_item_id?: number }>
    > = {
      l1: [{ id: 't1', list: { id: 'l1' } }],
      l2: [{ id: 't2', list: { id: 'l2' }, custom_item_id: 1004 }],
      l3: [{ id: 't3', list: { id: 'l3' } }],
    }
    const archivedByList: Record<string, Array<{ id: string; list: { id: string } }>> = {
      l1: [{ id: 'a1', list: { id: 'l1' } }],
    }
    return {
      getTeams: vi.fn().mockResolvedValue([{ id: 'ws1', name: 'krodak' }]),
      getSpaces: vi.fn().mockResolvedValue([
        { id: 'sp1', name: 'Kayenta' },
        { id: 'sp2', name: 'Other' },
      ]),
      getLists: vi.fn().mockResolvedValue([
        { id: 'l1', name: 'Roadmap' },
        { id: 'l2', name: 'Backlog' },
      ]),
      getFolders: vi.fn().mockResolvedValue([{ id: 'f1', name: 'Sprints' }]),
      getFolderLists: vi.fn().mockResolvedValue([{ id: 'l3', name: 'Sprint 1' }]),
      getTasksFromList: vi.fn(async (listId: string, _p: unknown, o: { archived?: boolean }) =>
        o.archived ? (archivedByList[listId] ?? []) : (tasksByList[listId] ?? []),
      ),
    }
  }

  it('resolves a space by id or case-insensitive name', async () => {
    const { discoverTeamTasks, resolveSpaceRef } = await import('../../../src/export/discover.js')
    const c = teamClient()
    expect(await resolveSpaceRef(c as never, 'ws1', 'sp1')).toEqual({ id: 'sp1', name: 'Kayenta' })
    expect(await resolveSpaceRef(c as never, 'ws1', 'kayenta')).toEqual({
      id: 'sp1',
      name: 'Kayenta',
    })
    await expect(resolveSpaceRef(c as never, 'ws1', 'nope')).rejects.toThrow(
      /Space "nope" not found.*Kayenta.*Other/,
    )
    void discoverTeamTasks
  })

  it('walks folderless lists and folder lists, both active and archived, and records the hierarchy', async () => {
    const { discoverTeamTasks } = await import('../../../src/export/discover.js')
    const c = teamClient()
    const plan = await discoverTeamTasks(c as never, 'ws1', 'Kayenta')

    expect(plan.slice).toEqual({ name: 'team-kayenta', kind: 'team', scope: 'sp1' })
    expect(plan.tasks.map(t => t.id).sort()).toEqual(['a1', 't1', 't2', 't3'])
    expect(plan.tasks.find(t => t.id === 't2')!.initiative).toBe(true)
    // one active + one archived call per list
    expect(c.getTasksFromList).toHaveBeenCalledTimes(6)
    expect(plan.hierarchy).toEqual({
      space: { id: 'sp1', name: 'Kayenta' },
      folders: [{ id: 'f1', name: 'Sprints', lists: [{ id: 'l3', name: 'Sprint 1' }] }],
      lists: [
        { id: 'l1', name: 'Roadmap' },
        { id: 'l2', name: 'Backlog' },
      ],
    })
  })

  it('includes archived lists and folders', async () => {
    const { discoverTeamTasks } = await import('../../../src/export/discover.js')
    const c = teamClient()
    await discoverTeamTasks(c as never, 'ws1', 'sp1')
    // getLists / getFolders / getFolderLists are called with archived=true as well
    expect(c.getLists).toHaveBeenCalledWith('sp1', true)
    expect(c.getFolders).toHaveBeenCalledWith('sp1', true)
  })
})

describe('discoverListTasks (roadmap / initiatives)', () => {
  function listClient() {
    return {
      getTeams: vi.fn().mockResolvedValue([{ id: 'ws1', name: 'krodak' }]),
      getListWithStatuses: vi.fn().mockResolvedValue({ id: 'l1', name: 'Kayenta Product Roadmap' }),
      getTasksFromList: vi.fn(async (_l: string, _p: unknown, o: { archived?: boolean }) =>
        o.archived
          ? [{ id: 'a1', list: { id: 'l1' } }]
          : [
              { id: 'i1', list: { id: 'l1' }, custom_item_id: 1004 },
              { id: 's1', list: { id: 'l1' }, parent: 'i1' },
              { id: 't1', list: { id: 'l1' } },
            ],
      ),
    }
  }

  it('roadmap: every task in the list, initiatives flagged', async () => {
    const { discoverListTasks } = await import('../../../src/export/discover.js')
    const plan = await discoverListTasks(listClient() as never, 'ws1', 'l1', { kind: 'roadmap' })
    expect(plan.slice).toEqual({
      name: 'roadmap-kayenta-product-roadmap',
      kind: 'roadmap',
      scope: 'l1',
    })
    expect(plan.tasks.map(t => t.id).sort()).toEqual(['a1', 'i1', 's1', 't1'])
    expect(plan.tasks.find(t => t.id === 'i1')!.initiative).toBe(true)
    expect(plan.list).toEqual({ id: 'l1', name: 'Kayenta Product Roadmap' })
  })

  it('initiatives: only tasks with the initiative item id (subtasks follow via the engine)', async () => {
    const { discoverListTasks } = await import('../../../src/export/discover.js')
    const plan = await discoverListTasks(listClient() as never, 'ws1', 'l1', {
      kind: 'initiatives',
      initiativeItemId: 1004,
    })
    expect(plan.slice.name).toBe('initiatives-kayenta-product-roadmap')
    expect(plan.tasks.map(t => t.id)).toEqual(['i1'])
  })

  it('initiatives: fails clearly when no task in the list has that item id', async () => {
    const { discoverListTasks } = await import('../../../src/export/discover.js')
    await expect(
      discoverListTasks(listClient() as never, 'ws1', 'l1', {
        kind: 'initiatives',
        initiativeItemId: 999,
      }),
    ).rejects.toThrow(/No tasks with custom item id 999.*found: 1004/)
  })
})
