const BASE_URL = 'https://api.clickup.com/api/v2'

export interface Task {
  id: string
  name: string
  description?: string
  status: { status: string; color: string }
  task_type?: string
  assignees: Array<{ id: number; username: string }>
  url: string
  list: { id: string; name: string }
  parent?: string
}

export interface CreateTaskOptions {
  name: string
  description?: string
  parent?: string
  status?: string
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
      headers: {
        Authorization: this.apiToken,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    })
    // Trust boundary: ClickUp API responses are cast to T without runtime validation.
    // res.json() is guarded against non-JSON bodies (e.g. HTML error pages from proxies).
    let data: Record<string, unknown>
    try {
      data = await res.json() as Record<string, unknown>
    } catch {
      throw new Error(`ClickUp API error ${res.status}: response was not valid JSON`)
    }
    if (!res.ok) {
      const errMsg = (data.err ?? data.error ?? data.ECODE ?? res.statusText) as string
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

  async getTasksFromList(listId: string, params: Record<string, string> = {}): Promise<Task[]> {
    const allTasks: Task[] = []
    let page = 0
    let lastPage = false

    while (!lastPage) {
      const qs = new URLSearchParams({ subtasks: 'true', page: String(page), ...params }).toString()
      const data = await this.request<{ tasks: Task[]; last_page: boolean }>(`/list/${listId}/task?${qs}`)
      const tasks = data.tasks ?? []
      allTasks.push(...tasks)
      lastPage = data.last_page ?? true
      page++
    }

    return allTasks
  }

  async getMyTasksFromList(listId: string): Promise<Task[]> {
    const me = await this.getMe()
    return this.getTasksFromList(listId, { assignees: String(me.id) })
  }

  async updateTaskDescription(taskId: string, description: string): Promise<Task> {
    return this.request<Task>(`/task/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ description })
    })
  }

  async createTask(listId: string, options: CreateTaskOptions): Promise<Task> {
    return this.request<Task>(`/list/${listId}/task`, {
      method: 'POST',
      body: JSON.stringify(options)
    })
  }
}
