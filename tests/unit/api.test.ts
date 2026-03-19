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

describe('isCustomTaskId', () => {
  let isCustomTaskId: typeof import('../../src/api.js').isCustomTaskId

  beforeEach(async () => {
    const api = await import('../../src/api.js')
    isCustomTaskId = api.isCustomTaskId
  })

  it('detects PREFIX-NUMBER format as custom', () => {
    expect(isCustomTaskId('PROJ-123')).toBe(true)
    expect(isCustomTaskId('DEV-42')).toBe(true)
    expect(isCustomTaskId('ENG-1085')).toBe(true)
    expect(isCustomTaskId('A-1')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isCustomTaskId('proj-123')).toBe(true)
    expect(isCustomTaskId('Proj-123')).toBe(true)
  })

  it('rejects native ClickUp IDs', () => {
    expect(isCustomTaskId('abc123xyz')).toBe(false)
    expect(isCustomTaskId('86a5bqwxr')).toBe(false)
    expect(isCustomTaskId('9hz')).toBe(false)
  })

  it('rejects empty and malformed strings', () => {
    expect(isCustomTaskId('')).toBe(false)
    expect(isCustomTaskId('-123')).toBe(false)
    expect(isCustomTaskId('PROJ-')).toBe(false)
    expect(isCustomTaskId('PROJ')).toBe(false)
    expect(isCustomTaskId('123')).toBe(false)
    expect(isCustomTaskId('PROJ-123-456')).toBe(false)
  })
})

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

describe('custom fields', () => {
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

  it('setCustomFieldValue sends POST with value body', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.setCustomFieldValue('t1', 'field_abc', 'hello')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1/field/field_abc'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ value: 'hello' }),
      }),
    )
  })

  it('removeCustomFieldValue sends DELETE to field endpoint', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.removeCustomFieldValue('t1', 'field_abc')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1/field/field_abc'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('deleteTask', () => {
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

  it('sends DELETE to task endpoint', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.deleteTask('t1')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.clickup.com/api/v2/task/t1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('task tags', () => {
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

  it('addTagToTask sends POST to tag endpoint', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.addTagToTask('t1', 'urgent')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1/tag/urgent'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('removeTagFromTask sends DELETE to tag endpoint', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.removeTagFromTask('t1', 'urgent')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1/tag/urgent'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('addTagToTask URL-encodes tag names with spaces', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.addTagToTask('t1', 'needs review')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/t1/tag/needs%20review')
  })
})

describe('updateComment', () => {
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

  it('sends PUT with comment_text', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.updateComment('c1', 'new text')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/comment/c1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ comment_text: 'new text' }),
      }),
    )
  })

  it('includes resolved flag when provided', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.updateComment('c1', 'text', true)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/comment/c1'),
      expect.objectContaining({
        body: JSON.stringify({ comment_text: 'text', resolved: true }),
      }),
    )
  })
})

describe('getListCustomFields', () => {
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

  it('returns fields for a list', async () => {
    const fields = [{ id: 'f1', name: 'Priority', type: 'drop_down' }]
    mockFetch.mockReturnValue(mockResponse({ fields }))
    const result = await client.getListCustomFields('l1')
    expect(result).toEqual(fields)
    expect(String(mockFetch.mock.calls[0]![0])).toContain('/list/l1/field')
  })
})

describe('checklist API methods', () => {
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

  it('createChecklist sends POST to task checklist endpoint', async () => {
    const checklist = { id: 'cl1', name: 'QA', orderindex: 0, items: [] }
    mockFetch.mockReturnValue(mockResponse({ checklist }))
    const result = await client.createChecklist('t1', 'QA')
    expect(result).toEqual(checklist)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1/checklist'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'QA' }),
      }),
    )
  })

  it('deleteChecklist sends DELETE to checklist endpoint', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.deleteChecklist('cl1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/checklist/cl1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('createChecklistItem sends POST to checklist item endpoint', async () => {
    const checklist = {
      id: 'cl1',
      name: 'QA',
      orderindex: 0,
      items: [{ id: 'i1', name: 'Step 1', resolved: false, orderindex: 0 }],
    }
    mockFetch.mockReturnValue(mockResponse({ checklist }))
    const result = await client.createChecklistItem('cl1', 'Step 1')
    expect(result).toEqual(checklist)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/checklist/cl1/checklist_item'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Step 1' }),
      }),
    )
  })

  it('editChecklistItem sends PUT to checklist item endpoint', async () => {
    const checklist = {
      id: 'cl1',
      name: 'QA',
      orderindex: 0,
      items: [{ id: 'i1', name: 'Updated', resolved: true, orderindex: 0 }],
    }
    mockFetch.mockReturnValue(mockResponse({ checklist }))
    const updates = { name: 'Updated', resolved: true }
    const result = await client.editChecklistItem('cl1', 'i1', updates)
    expect(result).toEqual(checklist)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/checklist/cl1/checklist_item/i1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    )
  })

  it('deleteChecklistItem sends DELETE to checklist item endpoint', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.deleteChecklistItem('cl1', 'i1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/checklist/cl1/checklist_item/i1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('time tracking API methods', () => {
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

  it('startTimeEntry sends POST to /team/{teamId}/time_entries/start', async () => {
    const entry = { id: 'te1', duration: -1 }
    mockFetch.mockReturnValue(mockResponse({ data: entry }))
    const result = await client.startTimeEntry('team1', 'task1', 'working')
    expect(result).toEqual(entry)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/team/team1/time_entries/start'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('stopTimeEntry sends POST to /team/{teamId}/time_entries/stop', async () => {
    const entry = { id: 'te1', duration: 3600000 }
    mockFetch.mockReturnValue(mockResponse({ data: entry }))
    const result = await client.stopTimeEntry('team1')
    expect(result).toEqual(entry)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/team/team1/time_entries/stop'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('getRunningTimeEntry sends GET to /team/{teamId}/time_entries/current', async () => {
    const entry = { id: 'te1', duration: -1 }
    mockFetch.mockReturnValue(mockResponse({ data: entry }))
    const result = await client.getRunningTimeEntry('team1')
    expect(result).toEqual(entry)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team1/time_entries/current')
  })

  it('getRunningTimeEntry returns null when no timer running', async () => {
    mockFetch.mockReturnValue(mockResponse({ data: null }))
    const result = await client.getRunningTimeEntry('team1')
    expect(result).toBeNull()
  })

  it('createTimeEntry sends POST to /team/{teamId}/time_entries', async () => {
    const entry = { id: 'te1', duration: 3600000 }
    mockFetch.mockReturnValue(mockResponse({ data: entry }))
    const result = await client.createTimeEntry('team1', 'task1', 3600000, {
      description: 'review',
    })
    expect(result).toEqual(entry)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/team/team1/time_entries'),
      expect.objectContaining({ method: 'POST' }),
    )
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.tid).toBe('task1')
    expect(body.duration).toBe(3600000)
    expect(body.description).toBe('review')
  })

  it('getTimeEntries sends GET to /team/{teamId}/time_entries with date params', async () => {
    mockFetch.mockReturnValue(mockResponse({ data: [{ id: 'te1' }] }))
    const result = await client.getTimeEntries('team1', {
      startDate: 1000,
      endDate: 2000,
    })
    expect(result).toEqual([{ id: 'te1' }])
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team1/time_entries')
    expect(url).toContain('start_date=1000')
    expect(url).toContain('end_date=2000')
  })

  it('getTimeEntries filters by taskId client-side', async () => {
    mockFetch.mockReturnValue(
      mockResponse({
        data: [
          { id: 'te1', task: { id: 't1' } },
          { id: 'te2', task: { id: 't2' } },
        ],
      }),
    )
    const result = await client.getTimeEntries('team1', { taskId: 't1' })
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('te1')
  })

  it('deleteTimeEntry sends DELETE to /team/{teamId}/time_entries/{id}', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.deleteTimeEntry('team1', 'te1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/team/team1/time_entries/te1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('deleteComment', () => {
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

  it('sends DELETE to /comment/{id}', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.deleteComment('c1')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.clickup.com/api/v2/comment/c1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('threaded comments', () => {
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

  it('getThreadedComments fetches replies for a comment', async () => {
    const comments = [{ id: 'r1', comment_text: 'reply', user: { username: 'u1' }, date: '123' }]
    mockFetch.mockReturnValue(mockResponse({ comments }))
    const result = await client.getThreadedComments('c1')
    expect(result).toEqual(comments)
    expect(String(mockFetch.mock.calls[0]![0])).toContain('/comment/c1/reply')
  })

  it('getThreadedComments returns empty array when no comments', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    const result = await client.getThreadedComments('c1')
    expect(result).toEqual([])
  })

  it('createThreadedComment sends POST to /comment/{id}/reply', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.createThreadedComment('c1', 'my reply')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/comment/c1/reply'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ comment_text: 'my reply' }),
      }),
    )
  })
})

describe('task links', () => {
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

  it('addTaskLink sends POST to /task/{id}/link/{linksTo}', async () => {
    mockFetch.mockReturnValue(mockResponse({ task: {} }))
    await client.addTaskLink('t1', 't2')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1/link/t2'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('deleteTaskLink sends DELETE to /task/{id}/link/{linksTo}', async () => {
    mockFetch.mockReturnValue(mockResponse({ task: {} }))
    await client.deleteTaskLink('t1', 't2')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/task/t1/link/t2'),
      expect.objectContaining({ method: 'DELETE' }),
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
