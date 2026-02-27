import { describe, it, expect } from 'vitest'
import type { Task } from '../../src/api.js'
import type { TaskSummary } from '../../src/commands/tasks.js'
import type { CommentSummary } from '../../src/commands/comments.js'
import type { ListSummary } from '../../src/commands/lists.js'
import {
  formatMarkdownTable,
  formatTasksMarkdown,
  formatCommentsMarkdown,
  formatListsMarkdown,
  formatSpacesMarkdown,
  formatGroupedTasksMarkdown,
  formatTaskDetailMarkdown,
  formatUpdateConfirmation,
  formatCreateConfirmation,
  formatCommentConfirmation,
  formatAssignConfirmation,
} from '../../src/markdown.js'

describe('formatMarkdownTable', () => {
  it('formats rows into a GFM table', () => {
    const rows = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
    ]
    const columns = [
      { key: 'id' as const, label: 'ID' },
      { key: 'name' as const, label: 'Name' },
    ]
    const result = formatMarkdownTable(rows, columns)
    expect(result).toBe(
      ['| ID | Name |', '| --- | --- |', '| 1 | Alpha |', '| 2 | Beta |'].join('\n'),
    )
  })

  it('returns header and divider only for empty rows', () => {
    const result = formatMarkdownTable([], [{ key: 'id' as const, label: 'ID' }])
    expect(result).toBe(['| ID |', '| --- |'].join('\n'))
  })

  it('escapes pipe characters in values', () => {
    const rows = [{ name: 'foo | bar' }]
    const columns = [{ key: 'name' as const, label: 'Name' }]
    const result = formatMarkdownTable(rows, columns)
    expect(result).toContain('| foo \\| bar |')
  })

  it('handles undefined values as empty string', () => {
    const rows = [{ id: '1', name: undefined as unknown as string }]
    const columns = [
      { key: 'id' as const, label: 'ID' },
      { key: 'name' as const, label: 'Name' },
    ]
    const result = formatMarkdownTable(rows, columns)
    expect(result).toContain('| 1 |  |')
  })

  it('handles null values as empty string', () => {
    const rows = [{ id: null as unknown as string }]
    const columns = [{ key: 'id' as const, label: 'ID' }]
    const result = formatMarkdownTable(rows, columns)
    expect(result).toContain('|  |')
  })
})

describe('formatTasksMarkdown', () => {
  it('formats tasks into a markdown table', () => {
    const tasks: TaskSummary[] = [
      {
        id: 'abc',
        name: 'My task',
        status: 'open',
        task_type: 'task',
        list: 'Sprint 1',
        url: 'https://example.com',
      },
    ]
    const result = formatTasksMarkdown(tasks)
    expect(result).toContain('| ID | Name | Status | List |')
    expect(result).toContain('| --- | --- | --- | --- |')
    expect(result).toContain('| abc | My task | open | Sprint 1 |')
  })

  it('returns no-tasks message for empty array', () => {
    expect(formatTasksMarkdown([])).toBe('No tasks found.')
  })
})

describe('formatCommentsMarkdown', () => {
  it('formats comments with user, date, and text', () => {
    const comments: CommentSummary[] = [
      { id: '1', user: 'alice', date: '2024-01-15', text: 'Hello world' },
      { id: '2', user: 'bob', date: '2024-01-16', text: 'Goodbye' },
    ]
    const result = formatCommentsMarkdown(comments)
    expect(result).toBe(
      [
        '**alice** (2024-01-15)',
        '',
        'Hello world',
        '',
        '---',
        '',
        '**bob** (2024-01-16)',
        '',
        'Goodbye',
      ].join('\n'),
    )
  })

  it('returns no-comments message for empty array', () => {
    expect(formatCommentsMarkdown([])).toBe('No comments found.')
  })
})

describe('formatListsMarkdown', () => {
  it('formats lists into a markdown table', () => {
    const lists: ListSummary[] = [{ id: '100', name: 'Backlog', folder: 'Engineering' }]
    const result = formatListsMarkdown(lists)
    expect(result).toContain('| ID | Name | Folder |')
    expect(result).toContain('| --- | --- | --- |')
    expect(result).toContain('| 100 | Backlog | Engineering |')
  })

  it('returns no-lists message for empty array', () => {
    expect(formatListsMarkdown([])).toBe('No lists found.')
  })
})

describe('formatSpacesMarkdown', () => {
  it('formats spaces into a markdown table', () => {
    const spaces = [{ id: '10', name: 'My Space' }]
    const result = formatSpacesMarkdown(spaces)
    expect(result).toContain('| ID | Name |')
    expect(result).toContain('| --- | --- |')
    expect(result).toContain('| 10 | My Space |')
  })

  it('returns no-spaces message for empty array', () => {
    expect(formatSpacesMarkdown([])).toBe('No spaces found.')
  })
})

describe('formatGroupedTasksMarkdown', () => {
  it('formats groups with headings and tables', () => {
    const groups = [
      {
        label: 'Sprint 1',
        tasks: [
          {
            id: 'a',
            name: 'Task A',
            status: 'open',
            task_type: 'task' as const,
            list: 'Backlog',
            url: 'https://example.com/a',
          },
        ],
      },
    ]
    const result = formatGroupedTasksMarkdown(groups)
    expect(result).toContain('## Sprint 1')
    expect(result).toContain('| a | Task A | open | Backlog |')
  })

  it('skips empty groups', () => {
    const groups = [
      { label: 'Empty', tasks: [] },
      {
        label: 'Has Tasks',
        tasks: [
          {
            id: 'b',
            name: 'Task B',
            status: 'done',
            task_type: 'task' as const,
            list: 'Dev',
            url: 'https://example.com/b',
          },
        ],
      },
    ]
    const result = formatGroupedTasksMarkdown(groups)
    expect(result).not.toContain('## Empty')
    expect(result).toContain('## Has Tasks')
  })

  it('returns no-tasks message when all groups are empty', () => {
    const groups = [
      { label: 'Empty1', tasks: [] },
      { label: 'Empty2', tasks: [] },
    ]
    expect(formatGroupedTasksMarkdown(groups)).toBe('No tasks found.')
  })
})

describe('formatTaskDetailMarkdown', () => {
  const fullTask: Task = {
    id: 'abc123',
    name: 'Implement login',
    description: 'Add OAuth2 login flow',
    text_content: 'Add OAuth2 login flow',
    status: { status: 'in progress', color: '#ff0000' },
    custom_item_id: 0,
    assignees: [
      { id: 1, username: 'alice' },
      { id: 2, username: 'bob' },
    ],
    url: 'https://app.clickup.com/t/abc123',
    list: { id: '100', name: 'Sprint 1' },
    parent: 'parent123',
    priority: { priority: 'high' },
    start_date: '1700000000000',
    due_date: '1700100000000',
    time_estimate: 7200000,
    time_spent: 3660000,
    tags: [{ name: 'frontend' }, { name: 'auth' }],
    date_created: '1699900000000',
    date_updated: '1700050000000',
  }

  it('renders title as h1', () => {
    const result = formatTaskDetailMarkdown(fullTask)
    expect(result).toContain('# Implement login')
  })

  it('renders key-value fields', () => {
    const result = formatTaskDetailMarkdown(fullTask)
    expect(result).toContain('**ID:** abc123')
    expect(result).toContain('**Status:** in progress')
    expect(result).toContain('**Type:** task')
    expect(result).toContain('**List:** Sprint 1')
    expect(result).toContain('**URL:** https://app.clickup.com/t/abc123')
    expect(result).toContain('**Assignees:** alice, bob')
    expect(result).toContain('**Priority:** high')
    expect(result).toContain('**Parent:** parent123')
    expect(result).toContain('**Tags:** frontend, auth')
  })

  it('formats initiative type from custom_item_id', () => {
    const task: Task = {
      ...fullTask,
      custom_item_id: 1,
    }
    const result = formatTaskDetailMarkdown(task)
    expect(result).toContain('**Type:** initiative')
  })

  it('formats dates as YYYY-MM-DD', () => {
    const result = formatTaskDetailMarkdown(fullTask)
    expect(result).toMatch(/\*\*Start Date:\*\* \d{4}-\d{2}-\d{2}/)
    expect(result).toMatch(/\*\*Due Date:\*\* \d{4}-\d{2}-\d{2}/)
    expect(result).toMatch(/\*\*Created:\*\* \d{4}-\d{2}-\d{2}/)
    expect(result).toMatch(/\*\*Updated:\*\* \d{4}-\d{2}-\d{2}/)
  })

  it('formats time estimate as Xh Ym', () => {
    const result = formatTaskDetailMarkdown(fullTask)
    expect(result).toContain('**Time Estimate:** 2h 0m')
  })

  it('formats time spent as Xh Ym', () => {
    const result = formatTaskDetailMarkdown(fullTask)
    expect(result).toContain('**Time Spent:** 1h 1m')
  })

  it('renders description section at the end', () => {
    const result = formatTaskDetailMarkdown(fullTask)
    expect(result).toContain('## Description')
    expect(result).toContain('Add OAuth2 login flow')
    expect(result.indexOf('## Description')).toBeGreaterThan(result.indexOf('**ID:**'))
  })

  it('omits missing fields for a minimal task', () => {
    const minimal: Task = {
      id: 'min1',
      name: 'Minimal',
      status: { status: 'open', color: '#000' },
      assignees: [],
      url: 'https://app.clickup.com/t/min1',
      list: { id: '1', name: 'List' },
    }
    const result = formatTaskDetailMarkdown(minimal)
    expect(result).toContain('# Minimal')
    expect(result).toContain('**ID:** min1')
    expect(result).toContain('**Status:** open')
    expect(result).not.toContain('**Priority:**')
    expect(result).not.toContain('**Parent:**')
    expect(result).not.toContain('**Start Date:**')
    expect(result).not.toContain('**Due Date:**')
    expect(result).not.toContain('**Time Estimate:**')
    expect(result).not.toContain('**Time Spent:**')
    expect(result).not.toContain('**Tags:**')
    expect(result).not.toContain('**Assignees:**')
    expect(result).not.toContain('## Description')
  })
})

describe('formatUpdateConfirmation', () => {
  it('formats update message', () => {
    expect(formatUpdateConfirmation('abc', 'My Task')).toBe('Updated task abc: "My Task"')
  })
})

describe('formatCreateConfirmation', () => {
  it('formats create message', () => {
    expect(formatCreateConfirmation('abc', 'My Task', 'https://example.com')).toBe(
      'Created task abc: "My Task" - https://example.com',
    )
  })
})

describe('formatCommentConfirmation', () => {
  it('formats comment confirmation', () => {
    expect(formatCommentConfirmation('c1')).toBe('Comment posted (id: c1)')
  })
})

describe('formatAssignConfirmation', () => {
  it('formats assign-to message', () => {
    expect(formatAssignConfirmation('t1', { to: 'alice' })).toBe('Assigned alice to t1')
  })

  it('formats remove message', () => {
    expect(formatAssignConfirmation('t1', { remove: 'bob' })).toBe('Removed bob from t1')
  })

  it('formats both assign and remove', () => {
    expect(formatAssignConfirmation('t1', { to: 'alice', remove: 'bob' })).toBe(
      'Assigned alice to t1; Removed bob from t1',
    )
  })
})
