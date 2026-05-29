import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { UserGroup } from '../api.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'

interface GroupRow {
  handle: string
  name: string
  id: string
  members: string
}

const GROUP_COLUMNS: Column<GroupRow>[] = [
  { key: 'handle', label: 'Handle', maxWidth: 25 },
  { key: 'name', label: 'Name', maxWidth: 30 },
  { key: 'id', label: 'ID', maxWidth: 38 },
  { key: 'members', label: 'Members', maxWidth: 8 },
]

export async function listGroups(config: Config): Promise<UserGroup[]> {
  const client = new ClickUpClient(config)
  return client.getGroups()
}

export function formatGroupsTable(groups: UserGroup[]): string {
  if (groups.length === 0) return 'No groups found'
  const rows: GroupRow[] = groups.map(g => ({
    handle: g.handle,
    name: g.name,
    id: g.id,
    members: String(g.members?.length ?? 0),
  }))
  return formatTable(rows, GROUP_COLUMNS)
}

export function formatGroupsMarkdown(groups: UserGroup[]): string {
  if (groups.length === 0) return 'No groups found'
  return groups
    .map(g => {
      const count = g.members?.length ?? 0
      const label = count === 1 ? '1 member' : `${count} members`
      return `- **@${g.handle}** ${g.name} (${g.id}) - ${label}`
    })
    .join('\n')
}
