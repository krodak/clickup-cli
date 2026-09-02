import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()

function mockResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
    headers: new Headers({ 'content-length': '1' }),
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

describe('custom task ID URL construction', () => {
  let clientWithTeam: import('../../src/api.js').ClickUpClient
  let clientWithoutTeam: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    clientWithTeam = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
    clientWithoutTeam = new ClickUpClient({ apiToken: 'pk_test' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('appends custom_task_ids params for custom IDs when teamId is set', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'PROJ-123', name: 'Task' }))
    await clientWithTeam.getTask('PROJ-123')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/PROJ-123')
    expect(url).toContain('custom_task_ids=true')
    expect(url).toContain('team_id=team123')
  })

  it('does not append custom_task_ids params for native IDs', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'abc123', name: 'Task' }))
    await clientWithTeam.getTask('abc123')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/abc123')
    expect(url).not.toContain('custom_task_ids')
  })

  it('does not append custom_task_ids params when teamId is not set', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'PROJ-123', name: 'Task' }))
    await clientWithoutTeam.getTask('PROJ-123')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/PROJ-123')
    expect(url).not.toContain('custom_task_ids')
  })

  it('appends custom_task_ids params for updateTask with custom ID', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'DEV-42', name: 'Task' }))
    await clientWithTeam.updateTask('DEV-42', { status: 'done' })
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/DEV-42')
    expect(url).toContain('custom_task_ids=true')
    expect(url).toContain('team_id=team123')
  })

  it('appends custom_task_ids params for deleteTask with custom ID', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await clientWithTeam.deleteTask('DEV-42')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/DEV-42')
    expect(url).toContain('custom_task_ids=true')
    expect(url).toContain('team_id=team123')
  })

  it('appends custom_task_ids params for postComment with custom ID', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'c1' }))
    await clientWithTeam.postComment('DEV-42', 'hello')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/DEV-42/comment')
    expect(url).toContain('custom_task_ids=true')
    expect(url).toContain('team_id=team123')
  })

  it('correctly handles suffix that already has query params', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'PROJ-1', name: 'Task' }))
    await clientWithTeam.getTask('PROJ-1')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('include_markdown_description=true')
    expect(url).toContain('custom_task_ids=true')
    expect(url).toContain('team_id=team123')
  })

  it('appends custom_task_ids params for startTimeEntry with custom ID in body', async () => {
    mockFetch.mockReturnValue(mockResponse({ data: { id: 'te1' } }))
    await clientWithTeam.startTimeEntry('team123', 'PROJ-42', 'working')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team123/time_entries/start')
    expect(url).toContain('custom_task_ids=true')
    expect(url).toContain('team_id=team123')
  })

  it('does not append custom_task_ids for startTimeEntry with native ID', async () => {
    mockFetch.mockReturnValue(mockResponse({ data: { id: 'te1' } }))
    await clientWithTeam.startTimeEntry('team123', 'abc123')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team123/time_entries/start')
    expect(url).not.toContain('custom_task_ids')
  })

  it('appends custom_task_ids params for createTimeEntry with custom ID in body', async () => {
    mockFetch.mockReturnValue(mockResponse({ data: { id: 'te1' } }))
    await clientWithTeam.createTimeEntry('team123', 'PROJ-42', 3600000)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team123/time_entries')
    expect(url).toContain('custom_task_ids=true')
    expect(url).toContain('team_id=team123')
  })

  it('does not append custom_task_ids for createTimeEntry with native ID', async () => {
    mockFetch.mockReturnValue(mockResponse({ data: { id: 'te1' } }))
    await clientWithTeam.createTimeEntry('team123', 'abc123', 3600000)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team123/time_entries')
    expect(url).not.toContain('custom_task_ids')
  })
})

describe('resolveTaskId and custom-id resolution in relationship fields', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolveTaskId resolves a custom id to its native id via getTask', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: '86native', name: 'X' }))
    const id = await client.resolveTaskId('PROD-811')
    expect(id).toBe('86native')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/PROD-811')
    expect(url).toContain('custom_task_ids=true')
  })

  it('resolveTaskId passes native ids through without an API call', async () => {
    const id = await client.resolveTaskId('86abc')
    expect(id).toBe('86abc')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('resolveTaskId extracts the id from a task URL without an API call', async () => {
    const id = await client.resolveTaskId('https://app.clickup.com/t/86urlid?tab=comments')
    expect(id).toBe('86urlid')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('addTaskLink resolves a custom-id linksTo to a native id in the path', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: '86native', name: 'X' }))
    mockFetch.mockReturnValue(mockResponse({ task: {} }))
    await client.addTaskLink('t1', 'PROD-811')
    const opUrl = String(mockFetch.mock.calls.at(-1)![0])
    expect(opUrl).toContain('/task/t1/link/86native')
    expect(opUrl).not.toContain('PROD-811')
  })

  it('addDependency resolves a custom-id depends_on to a native id in the body', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: '86dep', name: 'X' }))
    mockFetch.mockReturnValue(mockResponse({}))
    await client.addDependency('t1', { dependsOn: 'PROD-99' })
    const opUrl = String(mockFetch.mock.calls.at(-1)![0])
    const body = JSON.parse(String(mockFetch.mock.calls.at(-1)![1]!.body)) as Record<string, string>
    expect(opUrl).toContain('/task/t1/dependency')
    expect(body.depends_on).toBe('86dep')
  })

  it('mergeTasks resolves custom merge ids to native ids in the body', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: '86m', name: 'X' }))
    mockFetch.mockReturnValue(mockResponse({}))
    await client.mergeTasks('t1', ['PROD-5'])
    const body = JSON.parse(String(mockFetch.mock.calls.at(-1)![1]!.body)) as {
      merge_with: string[]
    }
    expect(body.merge_with).toEqual(['86m'])
  })
})

describe('task URL input', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('extracts custom task ID from a workspace URL for getTask', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'DEV-2760', name: 'Task' }))
    await client.getTask('https://app.clickup.com/t/9017679539/DEV-2760')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/DEV-2760')
    expect(url).toContain('custom_task_ids=true')
    expect(url).toContain('team_id=team123')
  })

  it('extracts native task ID from a URL for getTask', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'abc123def', name: 'Task' }))
    await client.getTask('https://app.clickup.com/t/abc123def?tab=comments')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/abc123def')
    expect(url).not.toContain('custom_task_ids')
  })

  it('extracts task ID from a URL for deleteTask', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.deleteTask('https://app.clickup.com/t/9017679539/DEV-2760')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/DEV-2760')
    expect(url).toContain('custom_task_ids=true')
  })

  it('extracts task ID from a URL for addTaskToList', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.addTaskToList('https://app.clickup.com/t/abc123def', 'list_1')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/list/list_1/task/abc123def')
  })

  it('extracts task ID from a URL for removeTaskFromList', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.removeTaskFromList('https://app.clickup.com/t/abc123def', 'list_1')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/list/list_1/task/abc123def')
  })

  it('extracts task ID from a URL for getTaskAttachments', async () => {
    mockFetch.mockReturnValue(mockResponse({ data: [] }))
    await client.getTaskAttachments('https://app.clickup.com/t/abc123def')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/tasks/abc123def/attachments')
  })

  it('extracts task ID from a URL for updateTimeEstimatesByUser', async () => {
    mockFetch.mockReturnValue(mockResponse({ total_time_estimate: 0, assignee_estimates: {} }))
    await client.updateTimeEstimatesByUser('https://app.clickup.com/t/abc123def', [])
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/tasks/abc123def/time_estimates_by_user')
  })

  it('extracts task ID from a URL for replaceTimeEstimatesByUser', async () => {
    mockFetch.mockReturnValue(mockResponse({ total_time_estimate: 0, updated_estimates: {} }))
    await client.replaceTimeEstimatesByUser('https://app.clickup.com/t/abc123def', [])
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/tasks/abc123def/time_estimates_by_user')
  })

  it('normalizes both task IDs from URLs for addTaskLink', async () => {
    mockFetch.mockReturnValue(mockResponse({ task: {} }))
    await client.addTaskLink(
      'https://app.clickup.com/t/abc123def',
      'https://app.clickup.com/t/xyz789',
    )
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/abc123def/link/xyz789')
  })

  it('normalizes both task IDs from URLs for deleteTaskLink', async () => {
    mockFetch.mockReturnValue(mockResponse({ task: {} }))
    await client.deleteTaskLink(
      'https://app.clickup.com/t/abc123def',
      'https://app.clickup.com/t/xyz789',
    )
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/abc123def/link/xyz789')
  })

  it('normalizes task ID and merge IDs from URLs for mergeTasks', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.mergeTasks('https://app.clickup.com/t/abc123def', [
      'https://app.clickup.com/t/xyz789',
    ])
    const url = String(mockFetch.mock.calls[0]![0])
    const body = JSON.parse(String(mockFetch.mock.calls[0]![1]!.body))
    expect(url).toContain('/task/abc123def/merge')
    expect(body.merge_with).toEqual(['xyz789'])
  })
})

describe('view URL input', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('extracts view ID from a URL for getViewTasks', async () => {
    mockFetch.mockReturnValue(mockResponse({ tasks: [], last_page: true }))
    await client.getViewTasks('https://app.clickup.com/9017679539/v/gr/a0z2g-712814')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/view/a0z2g-712814/task')
    expect(url).not.toContain('app.clickup.com/9017679539')
  })

  it('extracts view ID from a URL for getView', async () => {
    mockFetch.mockReturnValue(mockResponse({ view: { id: 'a0z2g-712814' } }))
    await client.getView('https://app.clickup.com/9017679539/v/li/a0z2g-712814')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/view/a0z2g-712814')
  })

  it('extracts view ID from a URL for getViewComments', async () => {
    mockFetch.mockReturnValue(mockResponse({ comments: [] }))
    await client.getViewComments('https://app.clickup.com/9017679539/v/gr/a0z2g-712814')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/view/a0z2g-712814/comment')
  })

  it('passes through a bare view ID for getViewTasks', async () => {
    mockFetch.mockReturnValue(mockResponse({ tasks: [], last_page: true }))
    await client.getViewTasks('a0z2g-712814')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/view/a0z2g-712814/task')
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
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-length': '1' }),
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    )
    await expect(client.getTasksFromList('list_1')).rejects.toThrow('not valid JSON')
  })

  it('throws when API returns a non-object JSON payload', async () => {
    mockFetch.mockReturnValue(mockResponse([]))
    await expect(client.getTeams()).rejects.toThrow('expected JSON object')
  })

  it('throws when getMe response is missing a valid user object', async () => {
    mockFetch.mockReturnValue(mockResponse({ user: null }))
    await expect(client.getMe()).rejects.toThrow('expected user object')
  })

  it('getTeams returns team array', async () => {
    mockFetch.mockReturnValue(mockResponse({ teams: [{ id: 't1', name: 'My Workspace' }] }))
    const teams = await client.getTeams()
    expect(teams).toEqual([{ id: 't1', name: 'My Workspace' }])
    expect(String(mockFetch.mock.calls[0]![0])).toMatch(/\/team$/)
  })

  it('throws when teams payload is not an array', async () => {
    mockFetch.mockReturnValue(mockResponse({ teams: { id: 't1', name: 'My Workspace' } }))
    await expect(client.getTeams()).rejects.toThrow('expected teams.teams to be an array')
  })

  it('getSpaces returns spaces for a team', async () => {
    mockFetch.mockReturnValue(mockResponse({ spaces: [{ id: 's1', name: 'Engineering' }] }))
    const spaces = await client.getSpaces('t1')
    expect(spaces).toEqual([{ id: 's1', name: 'Engineering' }])
    expect(String(mockFetch.mock.calls[0]![0])).toContain('/team/t1/space')
  })

  it('throws when spaces payload is not an array', async () => {
    mockFetch.mockReturnValue(mockResponse({ spaces: { id: 's1', name: 'Engineering' } }))
    await expect(client.getSpaces('t1')).rejects.toThrow('expected spaces.spaces to be an array')
  })

  it('getLists returns lists for a space', async () => {
    mockFetch.mockReturnValue(mockResponse({ lists: [{ id: 'l1', name: 'Sprint 1' }] }))
    const lists = await client.getLists('s1')
    expect(lists).toEqual([{ id: 'l1', name: 'Sprint 1' }])
    expect(String(mockFetch.mock.calls[0]![0])).toContain('/space/s1/list')
  })

  it('throws when space lists payload is not an array', async () => {
    mockFetch.mockReturnValue(mockResponse({ lists: { id: 'l1', name: 'Sprint 1' } }))
    await expect(client.getLists('s1')).rejects.toThrow('expected space lists.lists to be an array')
  })

  it('getFolders returns folders for a space', async () => {
    mockFetch.mockReturnValue(
      mockResponse({
        folders: [
          { id: 'f1', name: 'Q1 Work' },
          { id: 'f2', name: 'Q1 Work Subfolder', parent_folder: 'f1' },
        ],
      }),
    )
    const folders = await client.getFolders('s1')
    expect(folders).toEqual([
      { id: 'f1', name: 'Q1 Work' },
      { id: 'f2', name: 'Q1 Work Subfolder', parent_folder: 'f1' },
    ])
    expect(folders[0]).not.toHaveProperty('parent_folder')
    expect(folders[1]).toHaveProperty('parent_folder', 'f1')
    expect(String(mockFetch.mock.calls[0]![0])).toContain('/space/s1/folder')
  })

  it('throws when folders payload is not an array', async () => {
    mockFetch.mockReturnValue(mockResponse({ folders: { id: 'f1', name: 'Q1 Work' } }))
    await expect(client.getFolders('s1')).rejects.toThrow(
      'expected space folders.folders to be an array',
    )
  })

  it('getFolderLists returns lists for a folder', async () => {
    mockFetch.mockReturnValue(mockResponse({ lists: [{ id: 'l1', name: 'Sprint 1' }] }))
    const lists = await client.getFolderLists('f1')
    expect(lists).toEqual([{ id: 'l1', name: 'Sprint 1' }])
    expect(String(mockFetch.mock.calls[0]![0])).toContain('/folder/f1/list')
  })

  it('throws when folder lists payload is not an array', async () => {
    mockFetch.mockReturnValue(mockResponse({ lists: { id: 'l1', name: 'Sprint 1' } }))
    await expect(client.getFolderLists('f1')).rejects.toThrow(
      'expected folder lists.lists to be an array',
    )
  })

  it('throws when custom task types payload is not an array', async () => {
    mockFetch.mockReturnValue(mockResponse({ custom_items: { id: '1', name: 'Story' } }))
    await expect(client.getCustomTaskTypes('t1')).rejects.toThrow(
      'expected custom task types.custom_items to be an array',
    )
  })

  it('throws when task comments payload is not an array', async () => {
    mockFetch.mockReturnValue(mockResponse({ comments: { id: 'c1', comment_text: 'bad' } }))
    await expect(client.getTaskComments('t1')).rejects.toThrow(
      'expected task comments.comments to be an array',
    )
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

  it('rejects malformed non-array tasks payloads while paginating', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ user: { id: 42, username: 'me' } }))
      .mockReturnValueOnce(mockResponse({ tasks: { id: 't1' }, last_page: true }))

    await expect(client.getMyTasks('team1')).rejects.toThrow('expected tasks array')
  })

  it('rejects malformed non-boolean last_page payloads while paginating', async () => {
    mockFetch
      .mockReturnValueOnce(mockResponse({ user: { id: 42, username: 'me' } }))
      .mockReturnValueOnce(mockResponse({ tasks: [], last_page: 'true' }))

    await expect(client.getMyTasks('team1')).rejects.toThrow(
      'expected task page.last_page to be a boolean',
    )
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

describe('HTTP 204 No Content handling', () => {
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

  it('handles 204 response without throwing', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
      }),
    )
    await expect(client.deleteTask('t1')).resolves.not.toThrow()
  })

  it('handles response with content-length 0', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-length': '0' }),
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
      }),
    )
    await expect(client.deleteComment('c1')).resolves.not.toThrow()
  })

  it('throws on non-ok 204 response', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
      }),
    )
    await expect(client.deleteTask('t1')).rejects.toThrow('ClickUp API error 204: No Content')
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

  it('succeeds with 204 No Content response', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
      }),
    )
    await expect(client.deleteTask('t1')).resolves.not.toThrow()
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

  it('sends comment blocks when richBlocks provided', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    const blocks = [{ text: 'bold', attributes: { bold: true } }, { text: '\n' }]
    await client.updateComment('c1', 'bold', undefined, blocks)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/comment/c1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ comment: blocks }),
      }),
    )
  })
})

describe('postComment rich blocks', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends comment blocks when richBlocks provided', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'c1' }))
    const blocks = [{ text: 'Title' }, { text: '\n', attributes: { header: 2 } }]
    await client.postComment('t1', '## Title', false, blocks)
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.comment).toEqual(blocks)
    expect(body.comment_text).toBeUndefined()
  })

  it('sends comment_text when richBlocks not provided', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'c1' }))
    await client.postComment('t1', 'plain text')
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.comment_text).toBe('plain text')
    expect(body.comment).toBeUndefined()
  })
})

describe('createThreadedComment rich blocks', () => {
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

  it('sends comment blocks when richBlocks provided', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    const blocks = [{ text: 'reply', attributes: { bold: true } }, { text: '\n' }]
    await client.createThreadedComment('c1', '**reply**', false, blocks)
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.comment).toEqual(blocks)
    expect(body.comment_text).toBeUndefined()
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

  it('createChecklist throws when checklist is missing from response', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await expect(client.createChecklist('t1', 'QA')).rejects.toThrow('expected checklist object')
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

  it('createChecklistItem includes parent in body when provided', async () => {
    const checklist = {
      id: 'cl1',
      name: 'QA',
      orderindex: 0,
      items: [{ id: 'i1', name: 'Sub', resolved: false, orderindex: 0 }],
    }
    mockFetch.mockReturnValue(mockResponse({ checklist }))
    await client.createChecklistItem('cl1', 'Sub', 'parent1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/checklist/cl1/checklist_item'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Sub', parent: 'parent1' }),
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

  it('updateTimeEntry sends PUT to /team/{teamId}/time_entries/{id}', async () => {
    const entry = { id: 'te1', duration: 7200000 }
    mockFetch.mockReturnValue(mockResponse({ data: entry }))
    const result = await client.updateTimeEntry('team1', 'te1', { description: 'updated' })
    expect(result).toEqual(entry)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/team/team1/time_entries/te1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ description: 'updated' }),
      }),
    )
  })
})

describe('getSpaceTags', () => {
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

  it('sends GET to /space/{id}/tag', async () => {
    const tags = [{ name: 'bug', tag_fg: '#fff', tag_bg: '#f00' }]
    mockFetch.mockReturnValue(mockResponse({ tags }))
    const result = await client.getSpaceTags('s1')
    expect(result).toEqual(tags)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/space/s1/tag')
  })

  it('returns empty array when tags missing', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    const result = await client.getSpaceTags('s1')
    expect(result).toEqual([])
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

describe('Docs API v3 methods', () => {
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

  it('getDocs sends GET to v3 /workspaces/{id}/docs', async () => {
    const docs = [{ id: 'd1', name: 'My Doc', workspace_id: 1 }]
    mockFetch.mockReturnValue(mockResponse({ docs }))
    const result = await client.getDocs('w1')
    expect(result).toEqual(docs)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('https://api.clickup.com/api/v3/workspaces/w1/docs')
  })

  it('getDocs returns empty array when docs is missing', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    const result = await client.getDocs('w1')
    expect(result).toEqual([])
  })

  it('getDocPage sends GET to v3 /workspaces/{id}/docs/{docId}/pages/{pageId}', async () => {
    const page = { id: 'p1', doc_id: 'd1', name: 'Page 1', content: '# Hello' }
    mockFetch.mockReturnValue(mockResponse(page))
    const result = await client.getDocPage('w1', 'd1', 'p1')
    expect(result).toEqual(page)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('https://api.clickup.com/api/v3/workspaces/w1/docs/d1/pages/p1')
    expect(url).toContain('content_format=text/md')
  })

  it('createDoc sends POST to v3 /workspaces/{id}/docs with name', async () => {
    const doc = { id: 'd1', name: 'New Doc', workspace_id: 1 }
    mockFetch.mockReturnValue(mockResponse(doc))
    const result = await client.createDoc('w1', 'New Doc')
    expect(result).toEqual(doc)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.clickup.com/api/v3/workspaces/w1/docs'),
      expect.objectContaining({ method: 'POST' }),
    )
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    // ClickUp's v3 Create Doc accepts `name`; `title` and `content` are ignored,
    // which produced unnamed Docs with empty root pages.
    expect(body.name).toBe('New Doc')
    expect(body).not.toHaveProperty('title')
    expect(body).not.toHaveProperty('content')
  })

  it('createDocPage sends POST to v3 /workspaces/{id}/docs/{docId}/pages', async () => {
    const page = { id: 'p1', doc_id: 'd1', name: 'Page 1' }
    mockFetch.mockReturnValue(mockResponse(page))
    const result = await client.createDocPage('w1', 'd1', 'Page 1', '# Content', 'p0')
    expect(result).toEqual(page)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('https://api.clickup.com/api/v3/workspaces/w1/docs/d1/pages')
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.name).toBe('Page 1')
    expect(body.content).toBe('# Content')
    expect(body.parent_page_id).toBe('p0')
    expect(body.content_format).toBe('text/md')
  })

  it('editDocPage sends PUT to v3 /workspaces/{id}/docs/{docId}/pages/{pageId}', async () => {
    const page = { id: 'p1', doc_id: 'd1', name: 'Updated' }
    mockFetch.mockReturnValue(mockResponse(page))
    const result = await client.editDocPage('w1', 'd1', 'p1', { name: 'Updated', content: '# New' })
    expect(result).toEqual(page)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.clickup.com/api/v3/workspaces/w1/docs/d1/pages/p1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated', content: '# New' }),
      }),
    )
  })

  it('getDoc sends GET to v3 /workspaces/{id}/docs/{docId}', async () => {
    const doc = { id: 'd1', name: 'My Doc', workspace_id: 1 }
    mockFetch.mockReturnValue(mockResponse(doc))
    const result = await client.getDoc('w1', 'd1')
    expect(result).toEqual(doc)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toBe('https://api.clickup.com/api/v3/workspaces/w1/docs/d1')
  })

  it('getDocPageListing sends GET to v3 /workspaces/{id}/docs/{docId}/pages', async () => {
    const pages = [{ id: 'p1', doc_id: 'd1', name: 'Page 1' }]
    mockFetch.mockReturnValue(mockResponse(pages))
    const result = await client.getDocPageListing('w1', 'd1')
    expect(result).toEqual(pages)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('https://api.clickup.com/api/v3/workspaces/w1/docs/d1/pages')
  })

  it('getDocPageListing returns empty array for empty response', async () => {
    mockFetch.mockReturnValue(mockResponse([]))
    const result = await client.getDocPageListing('w1', 'd1')
    expect(result).toEqual([])
  })

  it('getDocPages sends GET to v3 /workspaces/{id}/docs/{docId}/pages with content_format', async () => {
    const pages = [{ id: 'p1', doc_id: 'd1', name: 'Page 1', content: '# Hello' }]
    mockFetch.mockReturnValue(mockResponse(pages))
    const result = await client.getDocPages('w1', 'd1')
    expect(result).toEqual(pages)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('https://api.clickup.com/api/v3/workspaces/w1/docs/d1/pages')
    expect(url).toContain('content_format=text/md')
  })

  it('getDocPages returns empty array for empty response', async () => {
    mockFetch.mockReturnValue(mockResponse([]))
    const result = await client.getDocPages('w1', 'd1')
    expect(result).toEqual([])
  })
})

describe('createSpace', () => {
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

  it('sends POST to /team/{teamId}/space with name and multiple_assignees', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 's1', name: 'Engineering' }))
    const result = await client.createSpace('team1', 'Engineering')
    expect(result).toEqual({ id: 's1', name: 'Engineering' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/team/team1/space'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Engineering', multiple_assignees: true }),
      }),
    )
  })
})

describe('createList', () => {
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

  it('sends POST to /space/{spaceId}/list with name', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'l1', name: 'Backlog' }))
    const result = await client.createList('s1', 'Backlog')
    expect(result).toEqual({ id: 'l1', name: 'Backlog' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/space/s1/list'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Backlog' }),
      }),
    )
  })
})

describe('createFolderList', () => {
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

  it('sends POST to /folder/{folderId}/list with name', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'l2', name: 'Sprint 1' }))
    const result = await client.createFolderList('f1', 'Sprint 1')
    expect(result).toEqual({ id: 'l2', name: 'Sprint 1' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/folder/f1/list'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Sprint 1' }),
      }),
    )
  })
})

describe('createFolder', () => {
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

  it('sends POST to /space/{spaceId}/folder with name', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'f1', name: 'Q1 Work' }))
    const result = await client.createFolder('s1', 'Q1 Work')
    expect(result).toEqual({ id: 'f1', name: 'Q1 Work' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/space/s1/folder'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Q1 Work' }),
      }),
    )
  })
})

describe('createCustomField', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts to /team/{id}/field and returns the field from the wrapper', async () => {
    const fieldData = { id: 'cf1', name: 'Story Points', type: 'number' }
    mockFetch.mockReturnValue(mockResponse({ field: fieldData }))
    const result = await client.createCustomField('team123', 'Story Points', 'number')
    expect(result).toEqual(fieldData)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team123/field')
    expect(url).not.toContain('workspace_id')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('includes name and type in the request body', async () => {
    mockFetch.mockReturnValue(mockResponse({ field: { id: 'cf1', name: 'Status', type: 'text' } }))
    await client.createCustomField('team123', 'Status', 'text', {
      description: 'Task status',
      required: true,
    })
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.name).toBe('Status')
    expect(body.type).toBe('text')
    expect(body.description).toBe('Task status')
    expect(body.required).toBe(true)
  })

  it('defaults description to empty string and required to false', async () => {
    mockFetch.mockReturnValue(mockResponse({ field: { id: 'cf1', name: 'Notes', type: 'text' } }))
    await client.createCustomField('team123', 'Notes', 'text')
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.description).toBe('')
    expect(body.required).toBe(false)
  })

  it('builds drop_down type_config options from the options array', async () => {
    mockFetch.mockReturnValue(
      mockResponse({ field: { id: 'cf1', name: 'Stage', type: 'drop_down' } }),
    )
    await client.createCustomField('team123', 'Stage', 'drop_down', {
      options: ['Alpha', 'Beta'],
    })
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    const typeConfig = body.type_config as { options: Array<{ name: string; orderindex: number }> }
    expect(typeConfig.options).toEqual([
      { name: 'Alpha', orderindex: 0 },
      { name: 'Beta', orderindex: 1 },
    ])
  })
})

describe('createListCustomField', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts to /list/{id}/field and returns the field from the wrapper', async () => {
    const fieldData = { id: 'cf9', name: 'Story Points', type: 'number' }
    mockFetch.mockReturnValue(mockResponse({ field: fieldData }))
    const result = await client.createListCustomField('list42', 'Story Points', 'number')
    expect(result).toEqual(fieldData)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/list/list42/field')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('includes name, type, description and required in the request body', async () => {
    mockFetch.mockReturnValue(mockResponse({ field: { id: 'cf9', name: 'Status', type: 'text' } }))
    await client.createListCustomField('list42', 'Status', 'text', {
      description: 'Task status',
      required: true,
    })
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.name).toBe('Status')
    expect(body.type).toBe('text')
    expect(body.description).toBe('Task status')
    expect(body.required).toBe(true)
  })

  it('builds drop_down type_config options from the options array', async () => {
    mockFetch.mockReturnValue(
      mockResponse({ field: { id: 'cf9', name: 'Stage', type: 'drop_down' } }),
    )
    await client.createListCustomField('list42', 'Stage', 'drop_down', {
      options: ['Alpha', 'Beta'],
    })
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    const typeConfig = body.type_config as { options: Array<{ name: string; orderindex: number }> }
    expect(typeConfig.options).toEqual([
      { name: 'Alpha', orderindex: 0 },
      { name: 'Beta', orderindex: 1 },
    ])
  })
})

describe('getView', () => {
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

  it('GETs view by ID', async () => {
    const view = { id: 'v1', name: 'Board', type: 'board' }
    mockFetch.mockReturnValue(mockResponse({ view }))
    const result = await client.getView('v1')
    expect(result).toEqual(view)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/view/v1'), expect.any(Object))
  })
})

describe('createListView', () => {
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

  it('POSTs to list view endpoint', async () => {
    const view = { id: 'v1', name: 'Board', type: 'board' }
    mockFetch.mockReturnValue(mockResponse({ view }))
    const result = await client.createListView('list1', { name: 'Board', type: 'board' })
    expect(result).toEqual(view)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/list/list1/view')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('updateView', () => {
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

  it('PUTs to view endpoint', async () => {
    const view = { id: 'v1', name: 'Updated', type: 'board' }
    mockFetch.mockReturnValue(mockResponse({ view }))
    const result = await client.updateView('v1', { name: 'Updated' })
    expect(result).toEqual(view)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/view/v1'),
      expect.objectContaining({ method: 'PUT' }),
    )
  })
})

describe('deleteView', () => {
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

  it('DELETEs view by ID', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers({ 'content-length': '0' }),
        json: () => Promise.resolve({}),
      }),
    )
    await client.deleteView('v1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/view/v1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('getListTemplates', () => {
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

  it('fetches list templates', async () => {
    const templates = [{ id: 'lt1', name: 'Sprint Board' }]
    mockFetch.mockReturnValue(mockResponse({ templates }))
    const result = await client.getListTemplates('team1')
    expect(result).toEqual(templates)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/team/team1/list_template'),
      expect.any(Object),
    )
  })
})

describe('getFolderTemplates', () => {
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

  it('fetches folder templates', async () => {
    const templates = [{ id: 'ft1', name: 'Department' }]
    mockFetch.mockReturnValue(mockResponse({ templates }))
    const result = await client.getFolderTemplates('team1')
    expect(result).toEqual(templates)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/team/team1/folder_template'),
      expect.any(Object),
    )
  })
})

describe('createListFromTemplate', () => {
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

  it('POSTs to space list_template endpoint', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'newlist1' }))
    const result = await client.createListFromTemplate('space1', 'tmpl1', 'My List', 'space')
    expect(result).toEqual({ id: 'newlist1' })
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/space/space1/list_template/tmpl1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('POSTs to folder list_template endpoint', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'newlist2' }))
    await client.createListFromTemplate('folder1', 'tmpl2', 'My List', 'folder')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/folder/folder1/list_template/tmpl2')
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

describe('deleteList', () => {
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

  it('sends DELETE to /list/{id}', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.deleteList('l1')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.clickup.com/api/v2/list/l1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('deleteFolder', () => {
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

  it('sends DELETE to /folder/{id}', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.deleteFolder('f1')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.clickup.com/api/v2/folder/f1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('deleteSpace', () => {
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

  it('sends DELETE to /space/{id}', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.deleteSpace('s1')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.clickup.com/api/v2/space/s1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('getTaskMembers', () => {
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

  it('returns members array from /task/{id}/member', async () => {
    const members = [
      { id: 1, username: 'alice', email: 'alice@example.com', initials: 'A' },
      { id: 2, username: 'bob', email: 'bob@example.com' },
    ]
    mockFetch.mockReturnValue(mockResponse({ members }))
    const result = await client.getTaskMembers('t1')
    expect(result).toEqual(members)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/t1/member')
  })

  it('returns empty array when members is missing', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    const result = await client.getTaskMembers('t1')
    expect(result).toEqual([])
  })
})

describe('getWorkspacePlan', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns plan object from /team/{teamId}/plan', async () => {
    const plan = { plan_id: 3, name: 'Business' }
    mockFetch.mockReturnValue(mockResponse(plan))
    const result = await client.getWorkspacePlan()
    expect(result).toEqual(plan)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team123/plan')
  })
})

describe('getTaskAttachments', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns attachments via v3 endpoint', async () => {
    const attachments = [
      {
        id: 'att1',
        title: 'screenshot.png',
        url: 'https://example.com/screenshot.png',
        extension: 'png',
        mime_type: 'image/png',
        size: 12345,
        date_created: 1700000000,
        user_id: 42,
      },
    ]
    mockFetch.mockReturnValue(mockResponse({ data: attachments }))
    const result = await client.getTaskAttachments('t1')
    expect(result).toEqual(attachments)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('https://api.clickup.com/api/v3/workspaces/team123/tasks/t1/attachments')
  })
})

describe('mergeTasks', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends POST to /task/{id}/merge with merge_with body', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.mergeTasks('t1', ['t2', 't3'])
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/task/t1/merge')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ merge_with: ['t2', 't3'] }),
      }),
    )
  })
})

describe('per-user time estimates', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('updateTimeEstimatesByUser sends PATCH to v3 time_estimates_by_user', async () => {
    const response = { total_time_estimate: 7200000, assignee_estimates: { '42': 3600000 } }
    mockFetch.mockReturnValue(mockResponse(response))
    const result = await client.updateTimeEstimatesByUser('t1', [{ assignee: 42, time: 3600000 }])
    expect(result).toEqual(response)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain(
      'https://api.clickup.com/api/v3/workspaces/team123/tasks/t1/time_estimates_by_user',
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('replaceTimeEstimatesByUser sends PUT to v3 time_estimates_by_user', async () => {
    const response = { total_time_estimate: 5400000, updated_estimates: { '42': 5400000 } }
    mockFetch.mockReturnValue(mockResponse(response))
    const result = await client.replaceTimeEstimatesByUser('t1', [{ assignee: 42, time: 5400000 }])
    expect(result).toEqual(response)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain(
      'https://api.clickup.com/api/v3/workspaces/team123/tasks/t1/time_estimates_by_user',
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PUT' }),
    )
  })
})

describe('getSharedHierarchy', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends GET to /team/{teamId}/shared and returns shared hierarchy', async () => {
    const shared = {
      spaces: [{ id: 's1', name: 'Shared Space' }],
      folders: [{ id: 'f1', name: 'Shared Folder' }],
      lists: [{ id: 'l1', name: 'Shared List' }],
    }
    mockFetch.mockReturnValue(mockResponse({ shared }))
    const result = await client.getSharedHierarchy()
    expect(result).toEqual({ shared })
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team123/shared')
  })
})

describe('webhooks', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getWebhooks sends GET to /team/{teamId}/webhook', async () => {
    const webhooks = [{ id: 'wh1', endpoint: 'https://example.com/hook', events: ['taskCreated'] }]
    mockFetch.mockReturnValue(mockResponse({ webhooks }))
    const result = await client.getWebhooks()
    expect(result).toEqual(webhooks)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team123/webhook')
  })

  it('createWebhook sends POST to /team/{teamId}/webhook', async () => {
    const webhook = { id: 'wh1', endpoint: 'https://example.com/hook', events: ['taskCreated'] }
    mockFetch.mockReturnValue(mockResponse({ webhook }))
    const result = await client.createWebhook('https://example.com/hook', ['taskCreated'], {
      spaceId: 's1',
    })
    expect(result).toEqual(webhook)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/team/team123/webhook')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
    const callArgs = mockFetch.mock.calls[0]![1] as RequestInit
    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>
    expect(body.endpoint).toBe('https://example.com/hook')
    expect(body.events).toEqual(['taskCreated'])
    expect(body.space_id).toBe('s1')
  })

  it('updateWebhook sends PUT to /webhook/{id}', async () => {
    const webhook = { id: 'wh1', endpoint: 'https://example.com/new', events: ['taskUpdated'] }
    mockFetch.mockReturnValue(mockResponse({ webhook }))
    const result = await client.updateWebhook('wh1', {
      endpoint: 'https://example.com/new',
      events: ['taskUpdated'],
    })
    expect(result).toEqual(webhook)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/webhook/wh1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('deleteWebhook sends DELETE to /webhook/{id}', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    await client.deleteWebhook('wh1')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/webhook/wh1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('list comments', () => {
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

  it('getListComments sends GET to /list/{id}/comment', async () => {
    const comments = [{ id: 'c1', comment_text: 'hello', user: { username: 'u1' }, date: '123' }]
    mockFetch.mockReturnValue(mockResponse({ comments }))
    const result = await client.getListComments('l1')
    expect(result).toEqual(comments)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/list/l1/comment')
  })

  it('postListComment sends POST to /list/{id}/comment', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'c1' }))
    const result = await client.postListComment('l1', 'list note', true)
    expect(result).toEqual({ id: 'c1' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/list/l1/comment'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ comment_text: 'list note', notify_all: true }),
      }),
    )
  })
})

describe('view comments', () => {
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

  it('getViewComments sends GET to /view/{id}/comment', async () => {
    const comments = [
      { id: 'c1', comment_text: 'view note', user: { username: 'u1' }, date: '456' },
    ]
    mockFetch.mockReturnValue(mockResponse({ comments }))
    const result = await client.getViewComments('v1')
    expect(result).toEqual(comments)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/view/v1/comment')
  })

  it('postViewComment sends POST to /view/{id}/comment', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'c2' }))
    const result = await client.postViewComment('v1', 'view note')
    expect(result).toEqual({ id: 'c2' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/view/v1/comment'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ comment_text: 'view note' }),
      }),
    )
  })
})

describe('getGroups', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends GET to /group with team_id query', async () => {
    const groups = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        team_id: 'team123',
        name: 'Mobile Team',
        handle: 'mobile-team',
        date_created: '1700000000000',
        members: [{ id: 1, username: 'alice', email: 'a@example.com' }],
      },
    ]
    mockFetch.mockReturnValue(mockResponse({ groups }))
    const result = await client.getGroups()
    expect(result).toEqual(groups)
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('/group?team_id=team123')
  })

  it('returns empty array when groups payload is missing', async () => {
    mockFetch.mockReturnValue(mockResponse({}))
    const result = await client.getGroups()
    expect(result).toEqual([])
  })

  it('throws when groups payload is not an array', async () => {
    mockFetch.mockReturnValue(mockResponse({ groups: { id: 'g1' } }))
    await expect(client.getGroups()).rejects.toThrow('expected groups.groups to be an array')
  })
})

describe('rate limit retry', () => {
  let client: import('../../src/api.js').ClickUpClient

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    vi.useFakeTimers()
    const { ClickUpClient } = await import('../../src/api.js')
    client = new ClickUpClient({ apiToken: 'pk_test', teamId: 't' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function retryableResponse(status: number, statusText: string, retryAfter?: string) {
    return Promise.resolve({
      ok: false,
      status,
      statusText,
      headers: new Headers(retryAfter ? { 'retry-after': retryAfter } : {}),
      json: () => Promise.resolve({ err: 'Rate limit' }),
    })
  }

  function response429(retryAfter?: string) {
    return retryableResponse(429, 'Too Many Requests', retryAfter)
  }

  it('retries on 429 then succeeds', async () => {
    mockFetch
      .mockReturnValueOnce(response429('1'))
      .mockReturnValueOnce(mockResponse({ id: 'abc', name: 'Task' }))
    const promise = client.getTask('abc')
    await vi.advanceTimersByTimeAsync(1000)
    const task = await promise
    expect(task.id).toBe('abc')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('honors Retry-After header', async () => {
    mockFetch
      .mockReturnValueOnce(response429('5'))
      .mockReturnValueOnce(mockResponse({ id: 'abc', name: 'Task' }))
    const promise = client.getTask('abc')
    await vi.advanceTimersByTimeAsync(4000)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    const task = await promise
    expect(task.id).toBe('abc')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('uses exponential backoff when no Retry-After', async () => {
    mockFetch
      .mockReturnValueOnce(response429())
      .mockReturnValueOnce(response429())
      .mockReturnValueOnce(mockResponse({ id: 'abc', name: 'Task' }))
    const promise = client.getTask('abc')
    await vi.advanceTimersByTimeAsync(1000)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(2000)
    const task = await promise
    expect(task.id).toBe('abc')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('gives up after max retries and throws', async () => {
    mockFetch.mockReturnValue(response429('1'))
    const promise = client.getTask('abc').catch(e => e)
    await vi.advanceTimersByTimeAsync(10000)
    const result = await promise
    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('429')
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })

  it('retries on 503', async () => {
    mockFetch
      .mockReturnValueOnce(retryableResponse(503, 'Service Unavailable'))
      .mockReturnValueOnce(mockResponse({ id: 'abc', name: 'Task' }))
    const promise = client.getTask('abc')
    await vi.advanceTimersByTimeAsync(1000)
    const task = await promise
    expect(task.id).toBe('abc')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('does NOT retry on 400', async () => {
    mockFetch.mockReturnValue(mockResponse({ err: 'bad' }, false))
    await expect(client.getTask('abc')).rejects.toThrow('400')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry on 404', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: () => Promise.resolve({ err: 'Not found' }),
      }),
    )
    await expect(client.getTask('abc')).rejects.toThrow('404')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries the requestV3Array fetch path on 429', async () => {
    mockFetch
      .mockReturnValueOnce(response429('1'))
      .mockReturnValueOnce(mockResponse([{ id: 'p1' }]))
    const promise = client.getDocPageListing('ws', 'doc')
    await vi.advanceTimersByTimeAsync(1000)
    const pages = await promise
    expect(pages).toEqual([{ id: 'p1' }])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('rate limiter integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('waits on the configured limiter before every request', async () => {
    const acquire = vi.fn().mockResolvedValue(undefined)
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({
      apiToken: 'pk_test',
      teamId: 'team1',
      rateLimiter: { acquire, penalize: vi.fn() },
    })
    mockFetch.mockReturnValue(mockResponse({ id: 't1', name: 'T' }))

    await client.getTask('t1')
    await client.getTask('t2')

    expect(acquire).toHaveBeenCalledTimes(2)
    expect(acquire.mock.invocationCallOrder[0]!).toBeLessThan(
      mockFetch.mock.invocationCallOrder[0]!,
    )
  })

  it('acquires a slot again for each retry after a 429, and penalizes the limiter', async () => {
    const acquire = vi.fn().mockResolvedValue(undefined)
    const penalize = vi.fn()
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test', rateLimiter: { acquire, penalize } })
    vi.spyOn(client as unknown as { sleep: () => Promise<void> }, 'sleep').mockResolvedValue()
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    mockFetch
      .mockReturnValueOnce(
        Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many',
          headers: new Headers({ 'content-length': '1' }),
          json: () => Promise.resolve({ err: 'slow down' }),
        }),
      )
      .mockReturnValueOnce(mockResponse({ id: 't1', name: 'T' }))

    await client.getTask('t1')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(acquire).toHaveBeenCalledTimes(2)
    expect(penalize).toHaveBeenCalledTimes(1)
  })

  it('works without a limiter (default)', async () => {
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test' })
    mockFetch.mockReturnValue(mockResponse({ id: 't1', name: 'T' }))
    await expect(client.getTask('t1')).resolves.toMatchObject({ id: 't1' })
  })
})

describe('getAllTaskComments pagination', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function comment(i: number) {
    return {
      id: `c${i}`,
      comment_text: `comment ${i}`,
      user: { username: 'u' },
      date: String(1000 - i),
    }
  }

  it('follows start/start_id cursors until a short page and dedupes the overlap', async () => {
    const page1 = Array.from({ length: 25 }, (_, i) => comment(i))
    // ClickUp includes the cursor comment again on the next page.
    const page2 = [comment(24), ...Array.from({ length: 10 }, (_, i) => comment(25 + i))]
    mockFetch
      .mockReturnValueOnce(mockResponse({ comments: page1 }))
      .mockReturnValueOnce(mockResponse({ comments: page2 }))

    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test' })
    const all = await client.getAllTaskComments('t1')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const secondUrl = String(mockFetch.mock.calls[1]![0])
    expect(secondUrl).toContain('start=' + encodeURIComponent('976'))
    expect(secondUrl).toContain('start_id=c24')
    expect(all.map(c => c.id)).toEqual([...page1, ...page2.slice(1)].map(c => c.id))
  })

  it('returns a single short page without a second request', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ comments: [comment(0), comment(1)] }))
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test' })
    const all = await client.getAllTaskComments('t1')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(all).toHaveLength(2)
  })

  it('stops when a full page yields no new comments', async () => {
    const page = Array.from({ length: 25 }, (_, i) => comment(i))
    mockFetch.mockReturnValue(mockResponse({ comments: page }))
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test' })
    const all = await client.getAllTaskComments('t1')
    expect(all).toHaveLength(25)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('export-oriented task fetches', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getMyTasks passes archived=true when requested', async () => {
    mockFetch.mockReturnValue(mockResponse({ tasks: [], last_page: true }))
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team1' })
    await client.getMyTasks('team1', { all: true, archived: true })
    expect(String(mockFetch.mock.calls[0]![0])).toContain('archived=true')
  })

  it('getMyTasks omits archived by default', async () => {
    mockFetch.mockReturnValue(mockResponse({ tasks: [], last_page: true }))
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team1' })
    await client.getMyTasks('team1', { all: true })
    expect(String(mockFetch.mock.calls[0]![0])).not.toContain('archived')
  })

  it('getTaskForExport requests markdown description and subtasks', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 't1', name: 'T', subtasks: [{ id: 's1' }] }))
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team1' })
    const task = await client.getTaskForExport('t1')
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('include_markdown_description=true')
    expect(url).toContain('include_subtasks=true')
    expect(task.subtasks?.[0]?.id).toBe('s1')
  })

  it('getTasksFromList passes archived=true when requested', async () => {
    mockFetch.mockReturnValue(mockResponse({ tasks: [], last_page: true }))
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test', teamId: 'team1' })
    await client.getTasksFromList('l1', {}, { includeClosed: true, archived: true })
    const url = String(mockFetch.mock.calls[0]![0])
    expect(url).toContain('archived=true')
    expect(url).toContain('include_closed=true')
  })
})

describe('getAllDocs cursor pagination', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('follows next_cursor until it is absent', async () => {
    mockFetch
      .mockReturnValueOnce(
        mockResponse({ docs: [{ id: 'd1', name: 'A', workspace_id: 1 }], next_cursor: 'abc' }),
      )
      .mockReturnValueOnce(
        mockResponse({ docs: [{ id: 'd2', name: 'B', workspace_id: 1 }], next_cursor: null }),
      )
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test' })
    const docs = await client.getAllDocs('ws1')
    expect(docs.map(d => d.id)).toEqual(['d1', 'd2'])
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const second = String(mockFetch.mock.calls[1]![0])
    expect(second).toContain('next_cursor=abc')
    expect(second).toContain('limit=50')
  })

  it('includes archived docs when asked', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ docs: [] }))
    const { ClickUpClient } = await import('../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_test' })
    await client.getAllDocs('ws1', { archived: true })
    expect(String(mockFetch.mock.calls[0]![0])).toContain('archived=true')
  })
})
