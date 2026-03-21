const BASE_URL = 'https://api.clickup.com/api/v2'
const BASE_URL_V3 = 'https://api.clickup.com/api/v3'
const MAX_PAGES = 100

export interface CustomField {
  id: string
  name: string
  type: string
  value: unknown
  type_config?: {
    options?: Array<{ id: number; name: string; orderindex?: number }>
  }
}

export interface Task {
  id: string
  name: string
  description?: string
  markdown_content?: string
  text_content?: string
  status: { status: string; color: string }
  custom_item_id?: number
  assignees: Array<{ id: number; username: string }>
  url: string
  list: { id: string; name: string }
  space?: { id: string }
  parent?: string
  priority?: { priority: string } | null
  start_date?: string | null
  due_date?: string | null
  time_estimate?: number | null
  time_spent?: number
  tags?: Array<{ name: string }>
  date_created?: string
  date_updated?: string
  locations?: Array<{ id: string; name: string }>
  custom_fields?: CustomField[]
  checklists?: Checklist[]
  attachments?: Attachment[]
  dependencies?: Array<{ task_id: string; depends_on: string; type: number }>
  linked_tasks?: Array<{ task_id: string; link_id: string; date_created: string }>
}

export interface TaskFilters {
  statuses?: string[]
  listIds?: string[]
  spaceIds?: string[]
  subtasks?: boolean
  includeClosed?: boolean
}

export type Priority = 1 | 2 | 3 | 4

export interface UpdateTaskOptions {
  name?: string
  description?: string
  markdown_content?: string
  status?: string
  priority?: Priority | null
  due_date?: number
  due_date_time?: boolean
  time_estimate?: number
  assignees?: { add?: number[]; rem?: number[] }
  parent?: string
}

export interface CreateTaskOptions {
  name: string
  description?: string
  markdown_content?: string
  parent?: string
  status?: string
  priority?: Priority | null
  due_date?: number
  due_date_time?: boolean
  time_estimate?: number
  assignees?: number[]
  tags?: string[]
  custom_item_id?: number
}

interface Team {
  id: string
  name: string
}

export interface Space {
  id: string
  name: string
}

interface SpaceStatus {
  status: string
  color: string
}

export interface SpaceWithStatuses extends Space {
  statuses: SpaceStatus[]
}

export interface List {
  id: string
  name: string
  start_date?: string | null
  due_date?: string | null
}

export interface ListWithStatuses extends List {
  statuses: SpaceStatus[]
}

interface Folder {
  id: string
  name: string
}

interface View {
  id: string
  name: string
  type: string
}

export interface Comment {
  id: string
  comment_text: string
  user: { username: string }
  date: string
}

export interface CustomTaskType {
  id: number
  name: string
}

export interface ChecklistItem {
  id: string
  name: string
  resolved: boolean
  assignee?: { id: number; username: string } | null
  orderindex: number
  parent?: string | null
}

export interface Checklist {
  id: string
  name: string
  orderindex: number
  items: ChecklistItem[]
}

export interface CustomFieldDefinition {
  id: string
  name: string
  type: string
  type_config?: {
    options?: Array<{
      id: string
      name: string
      orderindex: number
      label?: string
      color?: string
    }>
  }
  required?: boolean
}

export interface TimeEntry {
  id: string
  task?: { id: string; name: string; status: { status: string; color: string } }
  wid: string
  user: { id: number; username: string }
  start: string
  end?: string
  duration: number
  description: string
  tags: Array<{ name: string }>
  billable: boolean
  at: number
}

export interface Attachment {
  id: string
  version: string
  date: number
  title: string
  extension: string
  thumbnail_small?: string
  thumbnail_large?: string
  url: string
}

export interface Doc {
  id: string
  name: string
  workspace_id: number
  date_created?: string
  date_updated?: string
  pages?: DocPage[]
}

export interface DocPage {
  id: string
  doc_id: string
  name: string
  content?: string
  parent_page_id?: string
  date_created?: number
  date_updated?: number
  creator_id?: number
  archived?: boolean
  deleted?: boolean
  pages?: DocPage[]
}

export interface Member {
  id: number
  username: string
  email: string
  initials?: string
  role?: number
}

export interface Goal {
  id: string
  name: string
  description?: string
  date_created: string
  due_date?: string | null
  start_date?: string | null
  percent_completed: number
  key_result_count: number
  owner?: { id: number; username: string } | null
  color: string
  archived: boolean
}

export interface KeyResult {
  id: string
  name: string
  type: string
  unit?: string
  steps_current: number
  steps_end: number
  percent_completed: number
}

export interface TaskTemplate {
  id: string
  name: string
}

interface ClientConfig {
  apiToken: string
  teamId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function expectRecord(value: unknown, context: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Unexpected API response: expected ${context} object`)
  }
  return value
}

function expectRecordField(
  data: Record<string, unknown>,
  key: string,
  context: string,
): Record<string, unknown> {
  return expectRecord(data[key], context)
}

function expectNumericField(data: Record<string, unknown>, key: string, context: string): number {
  const value = Number(data[key])
  if (!Number.isInteger(value)) {
    throw new Error(`Unexpected API response: expected ${context}.${key} to be numeric`)
  }
  return value
}

function expectStringField(data: Record<string, unknown>, key: string, context: string): string {
  const value = data[key]
  if (typeof value !== 'string') {
    throw new Error(`Unexpected API response: expected ${context}.${key} to be a string`)
  }
  return value
}

function expectArrayField<T>(data: Record<string, unknown>, key: string, context: string): T[] {
  const value = data[key]
  if (!Array.isArray(value)) {
    throw new Error(`Unexpected API response: expected ${context}.${key} to be an array`)
  }
  return value as T[]
}

function readCollectionField<T>(data: Record<string, unknown>, key: string, context: string): T[] {
  if (data[key] === undefined) return []
  return expectArrayField<T>(data, key, context)
}

function expectBooleanField(data: Record<string, unknown>, key: string, context: string): boolean {
  const value = data[key]
  if (typeof value !== 'boolean') {
    throw new Error(`Unexpected API response: expected ${context}.${key} to be a boolean`)
  }
  return value
}

function expectPaginatedCollectionField<T>(
  data: Record<string, unknown>,
  key: string,
  context: string,
): { items: T[]; lastPage: boolean } {
  const items = data[key]
  if (!Array.isArray(items)) {
    throw new Error(`Unexpected API response: expected ${key} array`)
  }
  return {
    items: items as T[],
    lastPage: expectBooleanField(data, 'last_page', context),
  }
}

export function isCustomTaskId(id: string): boolean {
  return /^[A-Z]+-\d+$/i.test(id)
}

export class ClickUpClient {
  private apiToken: string
  private teamId: string | undefined
  private meCache: { id: number; username: string } | null = null

  constructor(config: ClientConfig) {
    this.apiToken = config.apiToken
    this.teamId = config.teamId
  }

  private taskPath(taskId: string, suffix = ''): string {
    const base = `/task/${taskId}${suffix}`
    if (isCustomTaskId(taskId) && this.teamId) {
      const sep = base.includes('?') ? '&' : '?'
      return `${base}${sep}custom_task_ids=true&team_id=${this.teamId}`
    }
    return base
  }

  private customIdQueryParams(taskId: string): string {
    if (isCustomTaskId(taskId) && this.teamId) {
      return `?custom_task_ids=true&team_id=${this.teamId}`
    }
    return ''
  }

  private async _fetch<T>(baseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: this.apiToken,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
    let parsed: unknown
    try {
      parsed = await res.json()
    } catch {
      throw new Error(`ClickUp API error ${res.status}: response was not valid JSON`)
    }
    const data = expectRecord(parsed, 'JSON')
    if (!res.ok) {
      const raw = data.err ?? data.error ?? data.ECODE ?? res.statusText
      const errMsg = typeof raw === 'string' ? raw : JSON.stringify(raw)
      throw new Error(`ClickUp API error ${res.status}: ${errMsg}`)
    }
    return data as T
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    return this._fetch(BASE_URL, path, options)
  }

  private async requestV3<T>(path: string, options: RequestInit = {}): Promise<T> {
    return this._fetch(BASE_URL_V3, path, options)
  }

  async getMe(): Promise<{ id: number; username: string }> {
    if (this.meCache) return this.meCache
    const data = await this.request<{ user: { id: number; username: string } }>('/user')
    const user = expectRecordField(data as Record<string, unknown>, 'user', 'user')
    this.meCache = {
      id: expectNumericField(user, 'id', 'user'),
      username: expectStringField(user, 'username', 'user'),
    }
    return this.meCache
  }

  private async paginate(buildPath: (page: number) => string): Promise<Task[]> {
    const allTasks: Task[] = []
    let page = 0
    let lastPage = false

    while (!lastPage && page < MAX_PAGES) {
      const data = await this.request<{ tasks: Task[]; last_page: boolean }>(buildPath(page))
      const taskPage = expectPaginatedCollectionField<Task>(
        data as Record<string, unknown>,
        'tasks',
        'task page',
      )
      allTasks.push(...taskPage.items)
      lastPage = taskPage.lastPage
      page++
    }

    if (page >= MAX_PAGES && !lastPage) {
      process.stderr.write(
        `Warning: reached maximum page limit (${MAX_PAGES}), results may be incomplete\n`,
      )
    }

    return allTasks
  }

  async getMyTasks(teamId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const me = await this.getMe()
    const baseParams = new URLSearchParams({
      subtasks: String(filters.subtasks ?? true),
    })
    if (filters.includeClosed) baseParams.set('include_closed', 'true')
    baseParams.append('assignees[]', String(me.id))
    for (const s of filters.statuses ?? []) baseParams.append('statuses[]', s)
    for (const id of filters.listIds ?? []) baseParams.append('list_ids[]', id)
    for (const id of filters.spaceIds ?? []) baseParams.append('space_ids[]', id)

    return this.paginate(page => {
      const params = new URLSearchParams(baseParams)
      params.set('page', String(page))
      return `/team/${teamId}/task?${params.toString()}`
    })
  }

  async updateTask(taskId: string, options: UpdateTaskOptions): Promise<Task> {
    return this.request<Task>(this.taskPath(taskId), {
      method: 'PUT',
      body: JSON.stringify(options),
    })
  }

  async postComment(
    taskId: string,
    commentText: string,
    notifyAll?: boolean,
  ): Promise<{ id: string }> {
    const body: Record<string, unknown> = { comment_text: commentText }
    if (notifyAll) body.notify_all = true
    return this.request<{ id: string }>(this.taskPath(taskId, '/comment'), {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async getTaskComments(taskId: string): Promise<Comment[]> {
    const data = await this.request<{ comments: Comment[] }>(this.taskPath(taskId, '/comment'))
    return readCollectionField<Comment>(
      data as Record<string, unknown>,
      'comments',
      'task comments',
    )
  }

  async getTasksFromList(
    listId: string,
    params: Record<string, string> = {},
    options: { includeClosed?: boolean } = {},
  ): Promise<Task[]> {
    return this.paginate(page => {
      const base: Record<string, string> = { subtasks: 'true', page: String(page), ...params }
      if (options.includeClosed) base['include_closed'] = 'true'
      const qs = new URLSearchParams(base).toString()
      return `/list/${listId}/task?${qs}`
    })
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request<Task>(this.taskPath(taskId, '?include_markdown_description=true'))
  }

  async createTask(listId: string, options: CreateTaskOptions): Promise<Task> {
    return this.request<Task>(`/list/${listId}/task`, {
      method: 'POST',
      body: JSON.stringify(options),
    })
  }

  async getTeams(): Promise<Team[]> {
    const data = await this.request<{ teams: Team[] }>('/team')
    return readCollectionField<Team>(data as Record<string, unknown>, 'teams', 'teams')
  }

  async getSpaceWithStatuses(spaceId: string): Promise<SpaceWithStatuses> {
    return this.request<SpaceWithStatuses>(`/space/${spaceId}`)
  }

  async getListWithStatuses(listId: string): Promise<ListWithStatuses> {
    return this.request<ListWithStatuses>(`/list/${listId}`)
  }

  async getSpaces(teamId: string): Promise<Space[]> {
    const data = await this.request<{ spaces: Space[] }>(`/team/${teamId}/space?archived=false`)
    return readCollectionField<Space>(data as Record<string, unknown>, 'spaces', 'spaces')
  }

  async getCustomTaskTypes(teamId: string): Promise<CustomTaskType[]> {
    const data = await this.request<{ custom_items: CustomTaskType[] }>(
      `/team/${teamId}/custom_item`,
    )
    return readCollectionField<CustomTaskType>(
      data as Record<string, unknown>,
      'custom_items',
      'custom task types',
    )
  }

  async getLists(spaceId: string): Promise<List[]> {
    const data = await this.request<{ lists: List[] }>(`/space/${spaceId}/list?archived=false`)
    return readCollectionField<List>(data as Record<string, unknown>, 'lists', 'space lists')
  }

  async getFolders(spaceId: string): Promise<Folder[]> {
    const data = await this.request<{ folders: Folder[] }>(
      `/space/${spaceId}/folder?archived=false`,
    )
    return readCollectionField<Folder>(data as Record<string, unknown>, 'folders', 'space folders')
  }

  async getFolderLists(folderId: string): Promise<List[]> {
    const data = await this.request<{ lists: List[] }>(`/folder/${folderId}/list?archived=false`)
    return readCollectionField<List>(data as Record<string, unknown>, 'lists', 'folder lists')
  }

  async getListViews(
    listId: string,
  ): Promise<{ views: View[]; required_views: Record<string, View | null> }> {
    return this.request<{ views: View[]; required_views: Record<string, View | null> }>(
      `/list/${listId}/view`,
    )
  }

  async getViewTasks(viewId: string): Promise<Task[]> {
    return this.paginate(page => `/view/${viewId}/task?page=${page}`)
  }

  async addTaskToList(taskId: string, listId: string): Promise<void> {
    await this.request(`/list/${listId}/task/${taskId}`, { method: 'POST' })
  }

  async removeTaskFromList(taskId: string, listId: string): Promise<void> {
    await this.request(`/list/${listId}/task/${taskId}`, { method: 'DELETE' })
  }

  async setCustomFieldValue(taskId: string, fieldId: string, value: unknown): Promise<void> {
    await this.request(this.taskPath(taskId, `/field/${fieldId}`), {
      method: 'POST',
      body: JSON.stringify({ value }),
    })
  }

  async removeCustomFieldValue(taskId: string, fieldId: string): Promise<void> {
    await this.request(this.taskPath(taskId, `/field/${fieldId}`), { method: 'DELETE' })
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.request(this.taskPath(taskId), { method: 'DELETE' })
  }

  async addTagToTask(taskId: string, tagName: string): Promise<void> {
    await this.request(this.taskPath(taskId, `/tag/${encodeURIComponent(tagName)}`), {
      method: 'POST',
    })
  }

  async removeTagFromTask(taskId: string, tagName: string): Promise<void> {
    await this.request(this.taskPath(taskId, `/tag/${encodeURIComponent(tagName)}`), {
      method: 'DELETE',
    })
  }

  async addDependency(
    taskId: string,
    opts: { dependsOn?: string; dependencyOf?: string },
  ): Promise<void> {
    const body: Record<string, string> = {}
    if (opts.dependsOn) body.depends_on = opts.dependsOn
    if (opts.dependencyOf) body.dependency_of = opts.dependencyOf
    await this.request(this.taskPath(taskId, '/dependency'), {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async deleteDependency(
    taskId: string,
    opts: { dependsOn?: string; dependencyOf?: string },
  ): Promise<void> {
    const params = new URLSearchParams()
    if (opts.dependsOn) params.set('depends_on', opts.dependsOn)
    if (opts.dependencyOf) params.set('dependency_of', opts.dependencyOf)
    await this.request(this.taskPath(taskId, `/dependency?${params.toString()}`), {
      method: 'DELETE',
    })
  }

  async updateComment(commentId: string, text: string, resolved?: boolean): Promise<void> {
    const body: Record<string, unknown> = { comment_text: text }
    if (resolved !== undefined) body.resolved = resolved
    await this.request<Record<string, never>>(`/comment/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.request<Record<string, never>>(`/comment/${commentId}`, { method: 'DELETE' })
  }

  async getThreadedComments(commentId: string): Promise<Comment[]> {
    const data = await this.request<{ comments: Comment[] }>(`/comment/${commentId}/reply`)
    return readCollectionField<Comment>(
      data as Record<string, unknown>,
      'comments',
      'threaded comments',
    )
  }

  async createThreadedComment(commentId: string, text: string, notifyAll?: boolean): Promise<void> {
    const body: Record<string, unknown> = { comment_text: text }
    if (notifyAll) body.notify_all = true
    await this.request<Record<string, never>>(`/comment/${commentId}/reply`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async addTaskLink(taskId: string, linksTo: string): Promise<void> {
    await this.request<{ task: unknown }>(this.taskPath(taskId, `/link/${linksTo}`), {
      method: 'POST',
    })
  }

  async deleteTaskLink(taskId: string, linksTo: string): Promise<void> {
    await this.request<{ task: unknown }>(this.taskPath(taskId, `/link/${linksTo}`), {
      method: 'DELETE',
    })
  }

  async getListCustomFields(listId: string): Promise<CustomFieldDefinition[]> {
    const data = await this.request<{ fields: CustomFieldDefinition[] }>(`/list/${listId}/field`)
    return readCollectionField<CustomFieldDefinition>(
      data as Record<string, unknown>,
      'fields',
      'list custom fields',
    )
  }

  async createChecklist(taskId: string, name: string): Promise<Checklist> {
    const data = await this.request<{ checklist: Checklist }>(this.taskPath(taskId, '/checklist'), {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    return expectRecordField(
      data as Record<string, unknown>,
      'checklist',
      'checklist',
    ) as unknown as Checklist
  }

  async deleteChecklist(checklistId: string): Promise<void> {
    await this.request<Record<string, never>>(`/checklist/${checklistId}`, { method: 'DELETE' })
  }

  async createChecklistItem(checklistId: string, name: string): Promise<Checklist> {
    const data = await this.request<{ checklist: Checklist }>(
      `/checklist/${checklistId}/checklist_item`,
      { method: 'POST', body: JSON.stringify({ name }) },
    )
    return expectRecordField(
      data as Record<string, unknown>,
      'checklist',
      'checklist',
    ) as unknown as Checklist
  }

  async editChecklistItem(
    checklistId: string,
    checklistItemId: string,
    updates: { name?: string; resolved?: boolean; assignee?: number | null },
  ): Promise<Checklist> {
    const data = await this.request<{ checklist: Checklist }>(
      `/checklist/${checklistId}/checklist_item/${checklistItemId}`,
      { method: 'PUT', body: JSON.stringify(updates) },
    )
    return expectRecordField(
      data as Record<string, unknown>,
      'checklist',
      'checklist',
    ) as unknown as Checklist
  }

  async deleteChecklistItem(checklistId: string, checklistItemId: string): Promise<void> {
    await this.request<Record<string, never>>(
      `/checklist/${checklistId}/checklist_item/${checklistItemId}`,
      { method: 'DELETE' },
    )
  }

  async startTimeEntry(teamId: string, taskId: string, description?: string): Promise<TimeEntry> {
    const body: Record<string, unknown> = {
      tid: taskId,
      start: Date.now(),
      duration: -1,
    }
    if (description) body.description = description
    const data = await this.request<{ data: TimeEntry }>(
      `/team/${teamId}/time_entries/start${this.customIdQueryParams(taskId)}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )
    return data.data
  }

  async stopTimeEntry(teamId: string): Promise<TimeEntry> {
    const data = await this.request<{ data: TimeEntry }>(`/team/${teamId}/time_entries/stop`, {
      method: 'POST',
    })
    return data.data
  }

  async getRunningTimeEntry(teamId: string): Promise<TimeEntry | null> {
    const data = await this.request<{ data: TimeEntry | null }>(
      `/team/${teamId}/time_entries/current`,
    )
    return data.data ?? null
  }

  async createTimeEntry(
    teamId: string,
    taskId: string,
    duration: number,
    opts?: { description?: string; start?: number },
  ): Promise<TimeEntry> {
    const start = opts?.start ?? Date.now() - duration
    const body: Record<string, unknown> = {
      tid: taskId,
      start,
      duration,
    }
    if (opts?.description) body.description = opts.description
    const data = await this.request<{ data: TimeEntry }>(
      `/team/${teamId}/time_entries${this.customIdQueryParams(taskId)}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )
    return data.data
  }

  async getTimeEntries(
    teamId: string,
    opts?: { startDate?: number; endDate?: number; taskId?: string },
  ): Promise<TimeEntry[]> {
    const params = new URLSearchParams()
    if (opts?.startDate != null) params.set('start_date', String(opts.startDate))
    if (opts?.endDate != null) params.set('end_date', String(opts.endDate))
    const query = params.toString()
    const url = `/team/${teamId}/time_entries${query ? `?${query}` : ''}`
    const data = await this.request<{ data: TimeEntry[] }>(url)
    const entries = readCollectionField<TimeEntry>(
      data as Record<string, unknown>,
      'data',
      'time entries',
    )
    if (opts?.taskId) {
      return entries.filter(e => e.task?.id === opts.taskId)
    }
    return entries
  }

  async updateTimeEntry(
    teamId: string,
    timeEntryId: string,
    updates: { description?: string; duration?: number; tags?: string[] },
  ): Promise<TimeEntry> {
    const data = await this.request<{ data: TimeEntry }>(
      `/team/${teamId}/time_entries/${timeEntryId}`,
      { method: 'PUT', body: JSON.stringify(updates) },
    )
    return data.data
  }

  async getSpaceTags(
    spaceId: string,
  ): Promise<Array<{ name: string; tag_fg: string; tag_bg: string }>> {
    const data = await this.request<{
      tags: Array<{ name: string; tag_fg: string; tag_bg: string }>
    }>(`/space/${spaceId}/tag`)
    return readCollectionField(data as Record<string, unknown>, 'tags', 'space tags')
  }

  async createSpaceTag(spaceId: string, name: string, fg?: string, bg?: string): Promise<void> {
    await this.request<Record<string, never>>(`/space/${spaceId}/tag`, {
      method: 'POST',
      body: JSON.stringify({
        tag: { name, tag_fg: fg ?? '#000000', tag_bg: bg ?? '#04A9F4' },
      }),
    })
  }

  async deleteSpaceTag(spaceId: string, tagName: string): Promise<void> {
    await this.request<Record<string, never>>(
      `/space/${spaceId}/tag/${encodeURIComponent(tagName)}`,
      { method: 'DELETE' },
    )
  }

  async getWorkspaceMembers(teamId: string): Promise<Member[]> {
    const data = await this.request<{
      teams: Array<{ id: string; members: Array<{ user: Member }> }>
    }>('/team')
    const team = readCollectionField<{ id: string; members: Array<{ user: Member }> }>(
      data as Record<string, unknown>,
      'teams',
      'workspace members',
    ).find(t => t.id === teamId)
    return team?.members?.map(m => m.user) ?? []
  }

  async deleteTimeEntry(teamId: string, timeEntryId: string): Promise<void> {
    await this.request<Record<string, never>>(`/team/${teamId}/time_entries/${timeEntryId}`, {
      method: 'DELETE',
    })
  }

  async createTaskAttachment(taskId: string, filePath: string): Promise<Attachment> {
    const { readFile } = await import('node:fs/promises')
    const { basename } = await import('node:path')
    const fileBuffer = await readFile(filePath)
    const fileName = basename(filePath)
    const formData = new FormData()
    formData.append('attachment', new Blob([fileBuffer]), fileName)
    const res = await fetch(`${BASE_URL}${this.taskPath(taskId, '/attachment')}`, {
      method: 'POST',
      headers: { Authorization: this.apiToken },
      body: formData,
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      let msg: string
      try {
        const data = (await res.json()) as { err?: string }
        msg = data.err ?? `HTTP ${res.status}`
      } catch {
        msg = `HTTP ${res.status}`
      }
      throw new Error(`ClickUp API error ${res.status}: ${msg}`)
    }
    let data: Attachment
    try {
      data = (await res.json()) as Attachment
    } catch {
      throw new Error(`ClickUp API error ${res.status}: response was not valid JSON`)
    }
    return data
  }

  async getDocs(workspaceId: string): Promise<Doc[]> {
    const data = await this.requestV3<{ docs: Doc[] }>(`/workspaces/${workspaceId}/docs`)
    return readCollectionField<Doc>(data as Record<string, unknown>, 'docs', 'docs')
  }

  async getDocPage(workspaceId: string, docId: string, pageId: string): Promise<DocPage> {
    return this.requestV3<DocPage>(
      `/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}?content_format=text/md`,
    )
  }

  async createDoc(
    workspaceId: string,
    title: string,
    content?: string,
    parentId?: string,
  ): Promise<Doc> {
    const body: Record<string, unknown> = { title }
    if (content) body.content = content
    if (parentId) {
      body.parent_id = parentId
      body.parent_type = 'doc'
    }
    return this.requestV3<Doc>(`/workspaces/${workspaceId}/docs`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async createDocPage(
    workspaceId: string,
    docId: string,
    name: string,
    content?: string,
    parentPageId?: string,
  ): Promise<DocPage> {
    const body: Record<string, unknown> = { name, content_format: 'text/md' }
    if (content) body.content = content
    if (parentPageId) body.parent_page_id = parentPageId
    return this.requestV3<DocPage>(`/workspaces/${workspaceId}/docs/${docId}/pages`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async editDocPage(
    workspaceId: string,
    docId: string,
    pageId: string,
    updates: { name?: string; content?: string },
  ): Promise<DocPage> {
    return this.requestV3<DocPage>(`/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async getDoc(workspaceId: string, docId: string): Promise<Doc> {
    return this.requestV3<Doc>(`/workspaces/${workspaceId}/docs/${docId}`)
  }

  async getDocPageListing(workspaceId: string, docId: string): Promise<DocPage[]> {
    const data = await this.requestV3<{ pages: DocPage[] }>(
      `/workspaces/${workspaceId}/docs/${docId}/pagelisting`,
    )
    return readCollectionField<DocPage>(
      data as Record<string, unknown>,
      'pages',
      'doc page listing',
    )
  }

  async getDocPages(workspaceId: string, docId: string): Promise<DocPage[]> {
    const data = await this.requestV3<{ pages: DocPage[] }>(
      `/workspaces/${workspaceId}/docs/${docId}/pages?content_format=text/md`,
    )
    return readCollectionField<DocPage>(data as Record<string, unknown>, 'pages', 'doc pages')
  }

  async getGoals(teamId: string): Promise<Goal[]> {
    const data = await this.request<{ goals: Goal[] }>(`/team/${teamId}/goal`)
    return readCollectionField<Goal>(data as Record<string, unknown>, 'goals', 'goals')
  }

  async createGoal(
    teamId: string,
    name: string,
    opts?: { description?: string; dueDate?: string; color?: string },
  ): Promise<Goal> {
    const body: Record<string, unknown> = { name, multiple_owners: true }
    if (opts?.description) body.description = opts.description
    if (opts?.dueDate) body.due_date = Number(opts.dueDate)
    if (opts?.color) body.color = opts.color
    const data = await this.request<{ goal: Goal }>(`/team/${teamId}/goal`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return data.goal
  }

  async updateGoal(
    goalId: string,
    updates: { name?: string; description?: string; color?: string },
  ): Promise<Goal> {
    const data = await this.request<{ goal: Goal }>(`/goal/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return data.goal
  }

  async getKeyResults(goalId: string): Promise<KeyResult[]> {
    const data = await this.request<{ goal: { key_results: KeyResult[] } }>(`/goal/${goalId}`)
    return data.goal?.key_results ?? []
  }

  async createKeyResult(
    goalId: string,
    name: string,
    type: string,
    stepsEnd: number,
  ): Promise<KeyResult> {
    const data = await this.request<{ key_result: KeyResult }>(`/goal/${goalId}/key_result`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        type,
        steps_start: 0,
        steps_end: stepsEnd,
        unit: type === 'number' ? 'items' : '%',
      }),
    })
    return data.key_result
  }

  async updateKeyResult(
    keyResultId: string,
    updates: { steps_current?: number; note?: string },
  ): Promise<KeyResult> {
    const data = await this.request<{ key_result: KeyResult }>(`/key_result/${keyResultId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return data.key_result
  }

  async deleteGoal(goalId: string): Promise<void> {
    await this.request<Record<string, never>>(`/goal/${goalId}`, { method: 'DELETE' })
  }

  async deleteKeyResult(keyResultId: string): Promise<void> {
    await this.request<Record<string, never>>(`/key_result/${keyResultId}`, { method: 'DELETE' })
  }

  async deleteDoc(workspaceId: string, docId: string): Promise<void> {
    await this.requestV3<Record<string, never>>(`/workspaces/${workspaceId}/docs/${docId}`, {
      method: 'DELETE',
    })
  }

  async deleteDocPage(workspaceId: string, docId: string, pageId: string): Promise<void> {
    await this.requestV3<Record<string, never>>(
      `/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}`,
      { method: 'DELETE' },
    )
  }

  async updateSpaceTag(
    spaceId: string,
    tagName: string,
    updates: { name: string; tag_fg?: string; tag_bg?: string },
  ): Promise<void> {
    await this.request<Record<string, never>>(
      `/space/${spaceId}/tag/${encodeURIComponent(tagName)}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          tag: {
            name: updates.name,
            tag_fg: updates.tag_fg ?? '#000000',
            tag_bg: updates.tag_bg ?? '#04A9F4',
          },
        }),
      },
    )
  }

  async getTaskTemplates(teamId: string): Promise<TaskTemplate[]> {
    const data = await this.request<{ templates: TaskTemplate[] }>(
      `/team/${teamId}/taskTemplate?page=0`,
    )
    return readCollectionField<TaskTemplate>(
      data as Record<string, unknown>,
      'templates',
      'task templates',
    )
  }

  async createTaskFromTemplate(listId: string, templateId: string, name: string): Promise<Task> {
    return this.request<Task>(`/list/${listId}/taskTemplate/${templateId}`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }
}
