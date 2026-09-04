import { describe, expect, it } from 'vitest'
import { renderUserIndex } from '../../../src/export/index-user.js'
import type { Task } from '../../../src/api.js'

function t(id: string, over: Partial<Task> = {}): Task {
  return {
    id,
    name: `Task ${id}`,
    status: { status: 'to do', color: '#000' },
    assignees: [],
    url: `https://app.clickup.com/t/${id}`,
    list: { id: 'l1', name: 'Roadmap' },
    space: { id: 'sp1' },
    ...over,
  }
}

describe('renderUserIndex', () => {
  const tasks: Task[] = [
    t('a', { status: { status: 'in progress', color: '' }, due_date: '1725000000000' }),
    t('b', { status: { status: 'to do', color: '' } }),
    t('c', {
      status: { status: 'done', color: '' },
      date_closed: '1719800000000', // 2024-07
      list: { id: 'l2', name: 'Sprint 4' },
    }),
    t('d', {
      status: { status: 'complete', color: '' },
      date_closed: '1722500000000', // 2024-08
    }),
    t('e', {
      status: { status: 'closed', color: '' },
      date_closed: null,
      date_done: '1722600000000',
    }),
  ]

  const md = renderUserIndex({ username: 'chris', id: 1 }, tasks, {
    exportedAt: '2026-08-30T10:00:00.000Z',
    spaceNames: { sp1: 'Atlas' },
  })

  it('leads with a title and counts', () => {
    expect(md).toMatch(/^# chris — tasks\n/)
    expect(md).toContain('5 tasks assigned')
    const one = renderUserIndex({ username: 'x', id: 1 }, [tasks[0]!], {
      exportedAt: '2026-08-30T10:00:00.000Z',
      spaceNames: {},
    })
    expect(one).toContain('1 task assigned')
    expect(md).toContain('Exported 2026-08-30')
  })

  it('groups open tasks by status with relative links', () => {
    expect(md).toContain('## In progress (1)')
    expect(md).toContain('| [Task a](../../tasks/a/task.md) | Roadmap | 2024-08-30 |')
    expect(md).toContain('## To do (1)')
  })

  it('groups closed tasks under Done by month, newest first', () => {
    expect(md).toContain('## Done (3)')
    const aug = md.indexOf('### 2024-08')
    const jul = md.indexOf('### 2024-07')
    expect(aug).toBeGreaterThan(-1)
    expect(jul).toBeGreaterThan(aug)
    expect(md).toContain('[Task c](../../tasks/c/task.md) | Sprint 4 |')
  })

  it('uses date_done when date_closed is missing', () => {
    expect(md.slice(md.indexOf('### 2024-08'), md.indexOf('### 2024-07'))).toContain('Task e')
  })

  it('summarises where tasks live', () => {
    expect(md).toContain('## Where these live')
    expect(md).toContain('Atlas / Roadmap: 4')
    expect(md).toContain('Atlas / Sprint 4: 1')
  })
})
