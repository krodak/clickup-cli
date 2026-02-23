import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data)
  })
}

describe('ClickUpClient', () => {
  let client: import('./api.js').ClickUpClient

  beforeEach(async () => {
    vi.clearAllMocks()
    const { ClickUpClient } = await import('./api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team_1' })
  })

  it('fetches tasks from a list', async () => {
    mockFetch.mockReturnValue(mockResponse({ tasks: [{ id: 't1', name: 'Test task' }] }))
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
      .mockReturnValueOnce(mockResponse({ user: { id: 42 } })) // getMe
      .mockReturnValueOnce(mockResponse({ tasks: [] }))
    const tasks = await client.getMyTasksFromList('list_1')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('updates task description', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 't1', description: 'updated' }))
    await client.updateTaskDescription('t1', 'updated description')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1'),
      expect.objectContaining({ method: 'PUT' })
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
