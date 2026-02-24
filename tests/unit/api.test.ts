import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()

function mockResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
    json: () => Promise.resolve(data),
  })
}

describe('ClickUpClient', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches tasks from a list', async () => {
    mockFetch.mockReturnValue(
      mockResponse({ tasks: [{ id: 't1', name: 'Test task' }], last_page: true }),
    )
    const tasks = await client.getTasksFromList('list_1')
    expect(tasks).toHaveLength(1)
    expect(tasks[0]!.id).toBe('t1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/list/list_1/task'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'pk_test' }) }),
    )
  })

  it('filters by assignee using teamId to get current user', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ user: { id: 42, username: 'me' } }))
      .mockReturnValueOnce(mockResponse({ tasks: [], last_page: true }))
    await client.getMyTasksFromList('list_1')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const secondCall = String(mockFetch.mock.calls[1]![0])
    expect(secondCall).toContain('assignees%5B%5D=42')
  })

  it('updates task description', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 't1', description: 'updated' }))
    await client.updateTaskDescription('t1', 'updated description')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ description: 'updated description' }),
      }),
    )
  })

  it('creates a task in a list', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 't2', name: 'New task' }))
    const task = await client.createTask('list_1', { name: 'New task' })
    expect(task.id).toBe('t2')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/list/list_1/task'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws on API error with message', async () => {
    mockFetch.mockReturnValue(mockResponse({ err: 'Not found' }, false))
    await expect(client.getTasksFromList('bad_list')).rejects.toThrow('Not found')
  })

  it('throws on non-JSON response body', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    )
    await expect(client.getTasksFromList('list_1')).rejects.toThrow('not valid JSON')
  })

  it('getAssignedListIds returns set of list IDs from assigned tasks', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ user: { id: 42, username: 'me' } }))
      .mockReturnValueOnce(
        mockResponse({
          tasks: [
            {
              id: 't1',
              list: { id: 'l1', name: 'Sprint 1' },
              status: { status: 'open', color: '' },
              assignees: [],
              url: '',
              name: 't1',
            },
            {
              id: 't2',
              list: { id: 'l2', name: 'Backlog' },
              status: { status: 'open', color: '' },
              assignees: [],
              url: '',
              name: 't2',
            },
            {
              id: 't3',
              list: { id: 'l1', name: 'Sprint 1' },
              status: { status: 'open', color: '' },
              assignees: [],
              url: '',
              name: 't3',
            },
          ],
          last_page: true,
        }),
      )
    const ids = await client.getAssignedListIds('team1')
    expect(ids).toEqual(new Set(['l1', 'l2']))
  })

  it('getTeams returns team array', async () => {
    mockFetch.mockReturnValue(mockResponse({ teams: [{ id: 't1', name: 'My Workspace' }] }))
    const teams = await client.getTeams()
    expect(teams).toEqual([{ id: 't1', name: 'My Workspace' }])
    expect(String(mockFetch.mock.calls[0]![0])).toMatch(/\/team$/)
  })

  it('getSpaces returns spaces for a team', async () => {
    mockFetch.mockReturnValue(mockResponse({ spaces: [{ id: 's1', name: 'Engineering' }] }))
    const spaces = await client.getSpaces('t1')
    expect(spaces).toEqual([{ id: 's1', name: 'Engineering' }])
    expect(String(mockFetch.mock.calls[0]![0])).toContain('/team/t1/space')
  })

  it('getLists returns lists for a space', async () => {
    mockFetch.mockReturnValue(mockResponse({ lists: [{ id: 'l1', name: 'Sprint 1' }] }))
    const lists = await client.getLists('s1')
    expect(lists).toEqual([{ id: 'l1', name: 'Sprint 1' }])
    expect(String(mockFetch.mock.calls[0]![0])).toContain('/space/s1/list')
  })

  it('getFolders returns folders for a space', async () => {
    mockFetch.mockReturnValue(mockResponse({ folders: [{ id: 'f1', name: 'Q1 Work' }] }))
    const folders = await client.getFolders('s1')
    expect(folders).toEqual([{ id: 'f1', name: 'Q1 Work' }])
    expect(String(mockFetch.mock.calls[0]![0])).toContain('/space/s1/folder')
  })

  it('getFolderLists returns lists for a folder', async () => {
    mockFetch.mockReturnValue(mockResponse({ lists: [{ id: 'l1', name: 'Sprint 1' }] }))
    const lists = await client.getFolderLists('f1')
    expect(lists).toEqual([{ id: 'l1', name: 'Sprint 1' }])
    expect(String(mockFetch.mock.calls[0]![0])).toContain('/folder/f1/list')
  })
})

describe('getMyTasks', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('queries team task endpoint with assignees[] param', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ user: { id: 42, username: 'me' } }))
      .mockReturnValueOnce(mockResponse({ tasks: [], last_page: true }))
    await client.getMyTasks('team1')
    const url = String(mockFetch.mock.calls[1]![0])
    expect(url).toContain('/team/team1/task')
    expect(url).toContain('assignees%5B%5D=42')
  })

  it('appends statuses[] filter when provided', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ user: { id: 42, username: 'me' } }))
      .mockReturnValueOnce(mockResponse({ tasks: [], last_page: true }))
    await client.getMyTasks('team1', { statuses: ['in progress'] })
    const url = String(mockFetch.mock.calls[1]![0])
    expect(url).toContain('statuses%5B%5D=in+progress')
  })

  it('appends list_ids[] filter when provided', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ user: { id: 42, username: 'me' } }))
      .mockReturnValueOnce(mockResponse({ tasks: [], last_page: true }))
    await client.getMyTasks('team1', { listIds: ['list_abc'] })
    const url = String(mockFetch.mock.calls[1]![0])
    expect(url).toContain('list_ids%5B%5D=list_abc')
  })

  it('paginates until last_page is true', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ user: { id: 42, username: 'me' } }))
      .mockReturnValueOnce(
        mockResponse({
          tasks: [
            {
              id: 't1',
              status: { status: 'open' },
              list: { id: 'l1', name: 'L1' },
              assignees: [],
              url: '',
              name: 't1',
            },
          ],
          last_page: false,
        }),
      )
      .mockReturnValueOnce(
        mockResponse({
          tasks: [
            {
              id: 't2',
              status: { status: 'open' },
              list: { id: 'l1', name: 'L1' },
              assignees: [],
              url: '',
              name: 't2',
            },
          ],
          last_page: true,
        }),
      )
    const tasks = await client.getMyTasks('team1')
    expect(tasks).toHaveLength(2)
    expect(tasks[0]!.id).toBe('t1')
    expect(tasks[1]!.id).toBe('t2')
  })
})

describe('updateTask', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends PUT request with provided fields', async () => {
    mockFetch.mockReturnValue(
      mockResponse({
        id: 't1',
        name: 'Task',
        status: { status: 'done', color: '' },
        list: { id: 'l1', name: 'L1' },
        assignees: [],
        url: '',
      }),
    )
    await client.updateTask('t1', { status: 'done' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1'),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'done' }) }),
    )
  })

  it('can update multiple fields at once', async () => {
    mockFetch.mockReturnValue(
      mockResponse({
        id: 't1',
        name: 'New name',
        status: { status: 'in progress', color: '' },
        list: { id: 'l1', name: 'L1' },
        assignees: [],
        url: '',
      }),
    )
    await client.updateTask('t1', { name: 'New name', status: 'in progress' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1'),
      expect.objectContaining({
        body: JSON.stringify({ name: 'New name', status: 'in progress' }),
      }),
    )
  })
})

describe('postComment', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs comment_text to task comment endpoint', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'c1' }))
    await client.postComment('t1', 'hello world')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1/comment'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ comment_text: 'hello world' }),
      }),
    )
  })
})
