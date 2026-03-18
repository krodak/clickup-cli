const BASE_URL = 'https://api.clickup.com/api/v2'
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

interface Comment {
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

interface ClientConfig {
  apiToken: string
}

export class ClickUpClient {
  private apiToken: string
  private meCache: { id: number; username: string } | null = null

  constructor(config: ClientConfig) {
    this.apiToken = config.apiToken
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: this.apiToken,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
    // Trust boundary: ClickUp API responses are cast to T without runtime validation.
    // res.json() is guarded against non-JSON bodies (e.g. HTML error pages from proxies).
    let data: Record<string, unknown>
    try {
      data = (await res.json()) as Record<string, unknown>
    } catch {
      throw new Error(`ClickUp API error ${res.status}: response was not valid JSON`)
    }
    if (!res.ok) {
      const raw = data.err ?? data.error ?? data.ECODE ?? res.statusText
      const errMsg = typeof raw === 'string' ? raw : JSON.stringify(raw)
      throw new Error(`ClickUp API error ${res.status}: ${errMsg}`)
    }
    return data as T
  }

  async getMe(): Promise<{ id: number; username: string }> {
    if (this.meCache) return this.meCache
    const data = await this.request<{ user: { id: number; username: string } }>('/user')
    this.meCache = data.user
    return data.user
  }

  private async paginate(buildPath: (page: number) => string): Promise<Task[]> {
    const allTasks: Task[] = []
    let page = 0
    let lastPage = false

    while (!lastPage && page < MAX_PAGES) {
      const data = await this.request<{ tasks: Task[]; last_page: boolean }>(buildPath(page))
      const tasks = data.tasks
      if (!Array.isArray(tasks)) {
        throw new Error(`Unexpected API response: expected tasks array, got ${typeof tasks}`)
      }
      allTasks.push(...tasks)
      lastPage = data.last_page ?? true
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
    return this.request<Task>(`/task/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(options),
    })
  }

  async postComment(taskId: string, commentText: string): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/task/${taskId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment_text: commentText }),
    })
  }

  async getTaskComments(taskId: string): Promise<Comment[]> {
    const data = await this.request<{ comments: Comment[] }>(`/task/${taskId}/comment`)
    return data.comments ?? []
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
    return this.request<Task>(`/task/${taskId}?include_markdown_description=true`)
  }

  async createTask(listId: string, options: CreateTaskOptions): Promise<Task> {
    return this.request<Task>(`/list/${listId}/task`, {
      method: 'POST',
      body: JSON.stringify(options),
    })
  }

  async getTeams(): Promise<Team[]> {
    const data = await this.request<{ teams: Team[] }>('/team')
    return data.teams ?? []
  }

  async getSpaceWithStatuses(spaceId: string): Promise<SpaceWithStatuses> {
    return this.request<SpaceWithStatuses>(`/space/${spaceId}`)
  }

  async getListWithStatuses(listId: string): Promise<ListWithStatuses> {
    return this.request<ListWithStatuses>(`/list/${listId}`)
  }

  async getSpaces(teamId: string): Promise<Space[]> {
    const data = await this.request<{ spaces: Space[] }>(`/team/${teamId}/space?archived=false`)
    return data.spaces ?? []
  }

  async getCustomTaskTypes(teamId: string): Promise<CustomTaskType[]> {
    const data = await this.request<{ custom_items: CustomTaskType[] }>(
      `/team/${teamId}/custom_item`,
    )
    return data.custom_items ?? []
  }

  async getLists(spaceId: string): Promise<List[]> {
    const data = await this.request<{ lists: List[] }>(`/space/${spaceId}/list?archived=false`)
    return data.lists ?? []
  }

  async getFolders(spaceId: string): Promise<Folder[]> {
    const data = await this.request<{ folders: Folder[] }>(
      `/space/${spaceId}/folder?archived=false`,
    )
    return data.folders ?? []
  }

  async getFolderLists(folderId: string): Promise<List[]> {
    const data = await this.request<{ lists: List[] }>(`/folder/${folderId}/list?archived=false`)
    return data.lists ?? []
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
    await this.request(`/task/${taskId}/field/${fieldId}`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    })
  }

  async removeCustomFieldValue(taskId: string, fieldId: string): Promise<void> {
    await this.request(`/task/${taskId}/field/${fieldId}`, { method: 'DELETE' })
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.request(`/task/${taskId}`, { method: 'DELETE' })
  }

  async addTagToTask(taskId: string, tagName: string): Promise<void> {
    await this.request(`/task/${taskId}/tag/${encodeURIComponent(tagName)}`, { method: 'POST' })
  }

  async removeTagFromTask(taskId: string, tagName: string): Promise<void> {
    await this.request(`/task/${taskId}/tag/${encodeURIComponent(tagName)}`, { method: 'DELETE' })
  }

  async addDependency(
    taskId: string,
    opts: { dependsOn?: string; dependencyOf?: string },
  ): Promise<void> {
    const body: Record<string, string> = {}
    if (opts.dependsOn) body.depends_on = opts.dependsOn
    if (opts.dependencyOf) body.dependency_of = opts.dependencyOf
    await this.request(`/task/${taskId}/dependency`, {
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
    await this.request(`/task/${taskId}/dependency?${params.toString()}`, {
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

  async getListCustomFields(listId: string): Promise<CustomFieldDefinition[]> {
    const data = await this.request<{ fields: CustomFieldDefinition[] }>(`/list/${listId}/field`)
    return data.fields ?? []
  }

  async createChecklist(taskId: string, name: string): Promise<Checklist> {
    const data = await this.request<{ checklist: Checklist }>(`/task/${taskId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    return data.checklist
  }

  async deleteChecklist(checklistId: string): Promise<void> {
    await this.request<Record<string, never>>(`/checklist/${checklistId}`, { method: 'DELETE' })
  }

  async createChecklistItem(checklistId: string, name: string): Promise<Checklist> {
    const data = await this.request<{ checklist: Checklist }>(
      `/checklist/${checklistId}/checklist_item`,
      { method: 'POST', body: JSON.stringify({ name }) },
    )
    return data.checklist
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
    return data.checklist
  }

  async deleteChecklistItem(checklistId: string, checklistItemId: string): Promise<void> {
    await this.request<Record<string, never>>(
      `/checklist/${checklistId}/checklist_item/${checklistItemId}`,
      { method: 'DELETE' },
    )
  }
}
