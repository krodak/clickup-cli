import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { Member } from '../api.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'

interface MemberRow {
  username: string
  id: string
  email: string
}

const MEMBER_COLUMNS: Column<MemberRow>[] = [
  { key: 'username', label: 'Username', maxWidth: 25 },
  { key: 'id', label: 'ID', maxWidth: 15 },
  { key: 'email', label: 'Email', maxWidth: 40 },
]

export async function listMembers(config: Config): Promise<Member[]> {
  const client = new ClickUpClient(config)
  return client.getWorkspaceMembers(config.teamId)
}

export function formatMembers(members: Member[]): string {
  if (members.length === 0) return 'No members found'
  const rows: MemberRow[] = members.map(m => ({
    username: m.username,
    id: String(m.id),
    email: m.email,
  }))
  return formatTable(rows, MEMBER_COLUMNS)
}

export function formatMembersMarkdown(members: Member[]): string {
  if (members.length === 0) return 'No members found'
  return members.map(m => `- **${m.username}** (${m.id}) - ${m.email}`).join('\n')
}
