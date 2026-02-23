import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetMyTasks = vi.fn()

vi.mock('../api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getMyTasks: mockGetMyTasks
  }))
}))

const makeTask = (id: string, date_updated: number, overrides = {}) => ({
  id,
  name: `Task ${id}`,
  date_updated: String(date_updated),
  custom_item_id: 0,
  status: { status: 'open', color: '' },
  url: `http://cu/${id}`,
  list: { id: 'l1', name: 'L1' },
  assignees: [],
  ...overrides
})

describe('fetchInbox', () => {
  beforeEach(() => { mockGetMyTasks.mockReset() })

  it('filters out tasks older than 7 days', async () => {
    const now = Date.now()
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', now - 1000),            // 1 second ago - include
      makeTask('t2', now - 3 * 86400 * 1000), // 3 days ago - include
      makeTask('t3', now - 8 * 86400 * 1000), // 8 days ago - exclude
    ])
    const { fetchInbox } = await import('./inbox.js')
    const result = await fetchInbox({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(2)
    expect(result.map(t => t.id)).not.toContain('t3')
  })

  it('sorts by date_updated descending (most recent first)', async () => {
    const now = Date.now()
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', now - 5000),
      makeTask('t2', now - 1000),
      makeTask('t3', now - 3000),
    ])
    const { fetchInbox } = await import('./inbox.js')
    const result = await fetchInbox({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result[0].id).toBe('t2')
    expect(result[1].id).toBe('t3')
    expect(result[2].id).toBe('t1')
  })

  it('returns empty array when no recent tasks', async () => {
    const now = Date.now()
    mockGetMyTasks.mockResolvedValue([
      makeTask('t1', now - 10 * 86400 * 1000),
    ])
    const { fetchInbox } = await import('./inbox.js')
    const result = await fetchInbox({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(0)
  })

  it('handles tasks with no date_updated (treated as 0 = old)', async () => {
    mockGetMyTasks.mockResolvedValue([
      { ...makeTask('t1', 0), date_updated: undefined }
    ])
    const { fetchInbox } = await import('./inbox.js')
    const result = await fetchInbox({ apiToken: 'pk_t', teamId: 'team1' })
    expect(result).toHaveLength(0)
  })
})
