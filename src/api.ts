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
  teamId: string
}

export class ClickUpClient {
  private apiToken: string
  private teamId: string
  private meCache: { id: number } | null = null

  constructor(config: ClientConfig) {
    this.apiToken = config.apiToken
    this.teamId = config.teamId
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: this.apiToken,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    const data = await res.json() as Record<string, unknown>
    if (!res.ok) {
      throw new Error(`ClickUp API error ${res.status}: ${data.err ?? JSON.stringify(data)}`)
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
    const qs = new URLSearchParams({ subtasks: 'true', ...params }).toString()
    const data = await this.request<{ tasks: Task[] }>(`/list/${listId}/task?${qs}`)
    return data.tasks
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
