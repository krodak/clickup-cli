import { describe, expect, it, vi } from 'vitest'
import { fetchTaskBundle } from '../../../src/export/bundle.js'

const baseTask = {
  id: 't1',
  name: 'Parent',
  status: { status: 'in progress', color: '#000' },
  assignees: [{ id: 1, username: 'chris' }],
  url: 'https://app.clickup.com/t/t1',
  list: { id: 'l1', name: 'Roadmap' },
  markdown_description: '# Hello',
  attachments: [
    { id: 'a1', version: '1', date: 1, title: 'shot.png', extension: 'png', url: 'https://cdn/a1' },
  ],
  subtasks: [{ id: 's1', name: 'Child' }],
}

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    getTaskForExport: vi.fn().mockResolvedValue(baseTask),
    getAllTaskComments: vi.fn().mockResolvedValue([
      { id: 'c1', comment_text: 'root', user: { username: 'a' }, date: '1', reply_count: 1 },
      { id: 'c2', comment_text: 'other', user: { username: 'b' }, date: '2' },
    ]),
    getThreadedComments: vi
      .fn()
      .mockResolvedValue([{ id: 'r1', comment_text: 'reply', user: { username: 'c' }, date: '3' }]),
    ...overrides,
  }
}

describe('fetchTaskBundle', () => {
  it('fetches the task, all comments, and replies only for threaded comments', async () => {
    const client = makeClient()
    const bundle = await fetchTaskBundle(client, 't1')

    expect(client.getTaskForExport).toHaveBeenCalledWith('t1')
    expect(client.getAllTaskComments).toHaveBeenCalledWith('t1')
    expect(client.getThreadedComments).toHaveBeenCalledTimes(1)
    expect(client.getThreadedComments).toHaveBeenCalledWith('c1')

    expect(bundle.task.id).toBe('t1')
    expect(bundle.comments).toHaveLength(2)
    expect(bundle.comments[0]!.replies.map(r => r.id)).toEqual(['r1'])
    expect(bundle.comments[1]!.replies).toEqual([])
  })

  it('fetches replies when ClickUp returns reply_count as a string', async () => {
    const client = makeClient({
      getAllTaskComments: vi.fn().mockResolvedValue([
        {
          id: 'c1',
          comment_text: 'root',
          user: { username: 'user' },
          date: '1',
          reply_count: '1',
        },
      ]),
    })

    const bundle = await fetchTaskBundle(client, 't1')

    expect(client.getThreadedComments).toHaveBeenCalledWith('c1')
    expect(bundle.comments[0]!.replies.map(r => r.id)).toEqual(['r1'])
  })

  it('exposes subtask ids and attachment metadata for the caller', async () => {
    const bundle = await fetchTaskBundle(makeClient(), 't1')
    expect(bundle.subtaskIds).toEqual(['s1'])
    expect(bundle.attachments.map(a => a.id)).toEqual(['a1'])
  })

  it('records fetchedAt as an ISO timestamp', async () => {
    const bundle = await fetchTaskBundle(makeClient(), 't1')
    expect(new Date(bundle.fetchedAt).toISOString()).toBe(bundle.fetchedAt)
  })
})
