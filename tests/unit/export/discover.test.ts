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
