import { describe, expect, it } from 'vitest'
import { renderRoadmapIndex, renderTeamIndex } from '../../../src/export/index-team.js'
import type { Task } from '../../../src/api.js'

function t(id: string, over: Partial<Task> = {}): Task {
  return {
    id,
    name: `Task ${id}`,
    status: { status: 'to do', color: '#000' },
    assignees: [],
    url: `https://app.clickup.com/t/${id}`,
    list: { id: 'l1', name: 'Roadmap' },
    ...over,
  }
}

describe('renderTeamIndex', () => {
  const hierarchy = {
    space: { id: 'sp1', name: 'Kayenta' },
    folders: [{ id: 'f1', name: 'Sprints', lists: [{ id: 'l3', name: 'Sprint 1' }] }],
    lists: [
      { id: 'l1', name: 'Roadmap' },
      { id: 'l2', name: 'Empty list' },
    ],
  }
  const tasks = [
    t('a', { assignees: [{ id: 1, username: 'chris' }] }),
    t('b', { custom_item_id: 1004, status: { status: 'done', color: '' } }),
    t('c', { list: { id: 'l3', name: 'Sprint 1' } }),
    t('sub', { parent: 'a' }),
  ]
  const md = renderTeamIndex(hierarchy, tasks, {
    exportedAt: '2026-08-30T10:00:00.000Z',
    relatedSlices: [{ name: 'roadmap-roadmap', listId: 'l1' }],
    initiativeItemId: 1004,
  })

  it('titles with the space and counts', () => {
    expect(md).toMatch(/^# Kayenta \(space\)\n/)
    expect(md).toContain('4 tasks')
    expect(md).toContain('3 lists · 1 folder')
    expect(md).toContain('· 4 tasks')
  })

  it('renders folderless lists then folders with their lists, tasks as tables', () => {
    const roadmap = md.indexOf('## Roadmap')
    const empty = md.indexOf('## Empty list')
    const sprints = md.indexOf('## Folder: Sprints')
    const sprint1 = md.indexOf('### Sprint 1')
    expect(roadmap).toBeGreaterThan(-1)
    expect(empty).toBeGreaterThan(roadmap)
    expect(sprints).toBeGreaterThan(empty)
    expect(sprint1).toBeGreaterThan(sprints)
    expect(md).toContain('| [Task a](../../tasks/a/task.md) | to do | chris | task |')
    expect(md).toContain('| [Task b](../../tasks/b/task.md) | done |  | initiative |')
    expect(md).toContain('| [Task c](../../tasks/c/task.md) | to do |  | task |')
  })

  it('shows only top-level tasks in list tables (subtasks live under their parent)', () => {
    expect(md).not.toContain('[Task sub]')
    expect(md).toContain('## Roadmap — 2 tasks')
    expect(md).toContain('### Sprint 1 — 1 task\n')
  })

  it('says when a list has no tasks', () => {
    expect(md).toContain('## Empty list — 0 tasks')
  })

  it('labels custom item types by workspace name when no --item-id is given', () => {
    const noItemId = renderTeamIndex(hierarchy, [t('m', { custom_item_id: 1 })], {
      exportedAt: '2026-08-30T10:00:00.000Z',
      typeNames: { 1: 'milestone' },
    })
    expect(noItemId).toContain('| [Task m](../../tasks/m/task.md) | to do |  | milestone |')
  })

  it('falls back to "type N" only when the id is unknown to the workspace', () => {
    const unknown = renderTeamIndex(hierarchy, [t('m', { custom_item_id: 42 })], {
      exportedAt: '2026-08-30T10:00:00.000Z',
      typeNames: { 1: 'milestone' },
    })
    expect(unknown).toContain('| type 42 |')
  })

  it('--item-id wins over the workspace name for the initiative type', () => {
    const both = renderTeamIndex(hierarchy, [t('m', { custom_item_id: 1 })], {
      exportedAt: '2026-08-30T10:00:00.000Z',
      typeNames: { 1: 'milestone' },
      initiativeItemId: 1,
    })
    expect(both).toContain('| initiative |')
  })

  it('cross-links to a roadmap slice for the same list', () => {
    expect(md).toContain('see also [roadmap-roadmap](../roadmap-roadmap/README.md)')
  })
})

describe('renderRoadmapIndex', () => {
  const tasks = [
    t('i1', {
      name: 'BridgeJS pointer identity',
      custom_item_id: 1004,
      status: { status: 'done', color: '' },
      assignees: [{ id: 1, username: 'chris' }],
      tags: [{ name: 'khasm-api-gen' }],
      start_date: '1710201600000', // 2024-03-12
      due_date: '1714608000000', // 2024-05-02
    }),
    t('s1', { name: 'Spike', parent: 'i1', status: { status: 'done', color: '' } }),
    t('s2', { name: 'Impl', parent: 'i1', status: { status: 'in progress', color: '' } }),
    t('s2a', { name: 'Wire cache', parent: 's2', status: { status: 'done', color: '' } }),
    t('i2', { name: 'Standup automation', custom_item_id: 1004 }),
    t('u1', { name: 'Loose task', assignees: [{ id: 2, username: 'alice' }] }),
  ]
  const md = renderRoadmapIndex({ id: 'l1', name: 'Kayenta Product Roadmap' }, tasks, {
    exportedAt: '2026-08-30T10:00:00.000Z',
    initiativeItemId: 1004,
  })

  it('titles with the list and counts initiatives vs tasks', () => {
    expect(md).toMatch(/^# Kayenta Product Roadmap\n/)
    expect(md).toContain('2 initiatives · 6 tasks')
    const one = renderRoadmapIndex({ id: 'l1', name: 'R' }, [tasks[0]!], {
      exportedAt: '2026-08-30T10:00:00.000Z',
      initiativeItemId: 1004,
    })
    expect(one).toContain('1 initiative · 1 task')
  })

  it('renders each initiative with metadata and a nested checklist tree of subtasks', () => {
    expect(md).toContain('### [BridgeJS pointer identity](../../tasks/i1/task.md) — done')
    expect(md).toContain('Owner: chris · Tags: khasm-api-gen · 2024-03-12 → 2024-05-02')
    expect(md).toContain('- [x] [Spike](../../tasks/s1/task.md)')
    expect(md).toContain('- [ ] [Impl](../../tasks/s2/task.md)')
    expect(md).toContain('    - [x] [Wire cache](../../tasks/s2a/task.md)')
  })

  it('lists initiatives without subtasks too', () => {
    expect(md).toContain('### [Standup automation](../../tasks/i2/task.md) — to do')
  })

  it('puts non-initiative top-level tasks under Ungrouped', () => {
    expect(md).toContain('## Ungrouped tasks (1)')
    expect(md).toContain('| [Loose task](../../tasks/u1/task.md) | to do | alice |')
  })
})
