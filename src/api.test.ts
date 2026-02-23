import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()

function mockResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
    json: () => Promise.resolve(data)
  })
}

describe('ClickUpClient', () => {
  let client: import('./api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('./api.js')
    client = new ClickUpClient({ apiToken: 'pk_test' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches tasks from a list', async () => {
    mockFetch.mockReturnValue(mockResponse({ tasks: [{ id: 't1', name: 'Test task' }], last_page: true }))
    const tasks = await client.getTasksFromList('list_1')
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe('t1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/list/list_1/task'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'pk_test' }) })
    )
  })

  it('filters by assignee using teamId to get current user', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ user: { id: 42, username: 'me' } }))
      .mockReturnValueOnce(mockResponse({ tasks: [], last_page: true }))
    await client.getMyTasksFromList('list_1')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const secondCall = mockFetch.mock.calls[1][0] as string
    expect(secondCall).toContain('assignees=42')
  })

  it('updates task description', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 't1', description: 'updated' }))
    await client.updateTaskDescription('t1', 'updated description')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ description: 'updated description' })
      })
    )
  })

  it('creates a task in a list', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 't2', name: 'New task' }))
    const task = await client.createTask('list_1', { name: 'New task' })
    expect(task.id).toBe('t2')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/list/list_1/task'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws on API error with message', async () => {
    mockFetch.mockReturnValue(mockResponse({ err: 'Not found' }, false))
    await expect(client.getTasksFromList('bad_list')).rejects.toThrow()
  })
})
