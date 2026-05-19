import { ClickUpClient } from '../api.js'
import type { TaskMember } from '../api.js'
import type { Config } from '../config.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'

interface TaskMemberRow {
  username: string
  id: string
  email: string
}

const TASK_MEMBER_COLUMNS: Column<TaskMemberRow>[] = [
  { key: 'username', label: 'Username', maxWidth: 25 },
  { key: 'id', label: 'ID', maxWidth: 15 },
  { key: 'email', label: 'Email', maxWidth: 40 },
]

export async function listTaskMembers(config: Config, taskId: string): Promise<TaskMember[]> {
  const client = new ClickUpClient(config)
  return client.getTaskMembers(taskId)
}

export function formatTaskMembers(members: TaskMember[]): string {
  if (members.length === 0) return 'No task members found'
  const rows: TaskMemberRow[] = members.map(m => ({
    username: m.username,
    id: String(m.id),
    email: m.email,
  }))
  return formatTable(rows, TASK_MEMBER_COLUMNS)
}

export function formatTaskMembersMarkdown(members: TaskMember[]): string {
  if (members.length === 0) return 'No task members found'
  return members.map(m => `- **${m.username}** (${m.id}) - ${m.email}`).join('\n')
}
