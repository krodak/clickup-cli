import { describe, expect, it } from 'vitest'
import { renderCommentsMarkdown, renderTaskMarkdown } from '../../../src/export/render.js'
import type { TaskBundle } from '../../../src/export/bundle.js'

function bundle(overrides: Partial<TaskBundle['task']> = {}): TaskBundle {
  return {
    task: {
      id: 't1',
      name: 'Parent task',
      status: { status: 'in progress', color: '#000' },
      assignees: [{ id: 1, username: 'chris' }],
      url: 'https://app.clickup.com/t/t1',
      list: { id: 'l1', name: 'Roadmap' },
      space: { id: 'sp1' },
      folder: { id: 'f1', name: 'Planning' },
      markdown_description: 'Body **here**.',
      custom_item_id: 1004,
      creator: { id: 9, username: 'alice' },
      date_created: '1700000000000',
      date_closed: null,
      custom_fields: [
        { id: 'cf1', name: 'Story Points', type: 'number', value: 5 },
        {
          id: 'cf2',
          name: 'Stage',
          type: 'drop_down',
          value: 1,
          type_config: {
            options: [
              { id: '0', name: 'Alpha', orderindex: 0 },
              { id: '1', name: 'Beta', orderindex: 1 },
            ],
          },
        },
        { id: 'cf3', name: 'Empty', type: 'text', value: null },
        {
          id: 'cf4',
          name: 'Epic',
          type: 'tasks',
          value: [{ id: 'other1', name: 'Some epic' }],
        },
      ],
      subtasks: [{ id: 's1', name: 'Child A' }],
      dependencies: [{ task_id: 't1', depends_on: 'dep1', type: 1 }],
      attachments: [
        {
          id: 'a1',
          version: '1',
          date: 1,
          title: 'shot.png',
          extension: 'png',
          url: 'https://cdn/a1',
        },
      ],
      ...overrides,
    },
    comments: [],
    attachments: [],
    subtaskIds: ['s1'],
    fetchedAt: '2026-08-30T10:00:00.000Z',
  }
}

const ctx = {
  /** Which task ids exist in the archive (drives relative vs external links). */
  hasTask: (id: string) => id === 's1' || id === 't1',
  /** Local attachment filename by attachment id, if downloaded. */
  attachmentPath: (id: string) => (id === 'a1' ? 'attachments/shot.png' : undefined),
}

describe('renderTaskMarkdown', () => {
  it('renders custom fields with dropdown ids resolved to labels and skips empty ones', () => {
    const md = renderTaskMarkdown(bundle(), ctx)
    expect(md).toContain('## Custom Fields')
    expect(md).toContain('| Story Points | 5 |')
    expect(md).toContain('| Stage | Beta |')
    expect(md).not.toContain('| Empty |')
  })

  it('links task-relationship field values like other task references', () => {
    const md = renderTaskMarkdown(bundle(), ctx)
    expect(md).toContain('[Some epic](https://app.clickup.com/t/other1) (not exported)')
  })

  it('links subtasks relatively when exported and externally when not', () => {
    const md = renderTaskMarkdown(bundle(), ctx)
    expect(md).toContain('- [Child A](../s1/task.md)')
    expect(md).toContain('- depends on [dep1](https://app.clickup.com/t/dep1) (not exported)')
  })

  it('points attachment links at local files when downloaded', () => {
    const md = renderTaskMarkdown(bundle(), ctx)
    expect(md).toContain('- [shot.png](attachments/shot.png)')
    expect(md).not.toContain('https://cdn/a1')
  })

  it('falls back to the CDN url when the attachment was not downloaded', () => {
    const md = renderTaskMarkdown(bundle(), { ...ctx, attachmentPath: () => undefined })
    expect(md).toContain('- [shot.png](https://cdn/a1) (not downloaded)')
  })

  it('includes provenance: type, creator, folder, exported timestamp', () => {
    const md = renderTaskMarkdown(bundle(), ctx)
    expect(md).toContain('**Type:** initiative')
    expect(md).toContain('**Creator:** alice')
    expect(md).toContain('**Folder:** Planning')
    expect(md).toContain('**Exported:** 2026-08-30T10:00:00.000Z')
  })

  it('marks archived tasks', () => {
    const md = renderTaskMarkdown(bundle({ archived: true }), ctx)
    expect(md).toContain('**Archived:** yes')
  })
})

describe('renderCommentsMarkdown', () => {
  it('renders threads with replies indented under their parent', () => {
    const b = bundle()
    b.comments = [
      {
        id: 'c1',
        comment_text: 'Root comment',
        user: { username: 'alice' },
        date: '1700000000000',
        replies: [
          { id: 'r1', comment_text: 'A reply', user: { username: 'bob' }, date: '1700000100000' },
        ],
      },
      {
        id: 'c2',
        comment_text: 'Second',
        user: { username: 'carol' },
        date: '1700000200000',
        replies: [],
      },
    ]
    const md = renderCommentsMarkdown(b)
    expect(md).toContain('# Comments (2)')
    expect(md).toContain('**alice** (2023-11-14')
    expect(md).toContain('Root comment')
    expect(md).toContain('> **bob**')
    expect(md).toContain('> A reply')
    expect(md.indexOf('Root comment')).toBeLessThan(md.indexOf('A reply'))
    expect(md.indexOf('A reply')).toBeLessThan(md.indexOf('Second'))
  })

  it('says so when there are no comments', () => {
    expect(renderCommentsMarkdown(bundle())).toContain('No comments.')
  })
})
