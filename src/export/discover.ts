import type { ClickUpClient, Task } from '../api.js'
import type { DiscoveredTask, ExportPlan } from './engine.js'

export interface ResolvedUser {
  id: number
  username: string
}

type DiscoverClient = Pick<
  ClickUpClient,
  'getMe' | 'getWorkspaceMembers' | 'getMyTasks' | 'getTeams'
>

/** Directory-safe slug from a display name. */
export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'unnamed'
  )
}

/** `me`, a numeric id, an email, or a username. */
export async function resolveUserRef(
  client: DiscoverClient,
  teamId: string,
  ref: string,
): Promise<ResolvedUser> {
  if (ref === 'me') {
    const me = await client.getMe()
    return { id: me.id, username: me.username }
  }
  const members = await client.getWorkspaceMembers(teamId)
  const needle = ref.trim().toLowerCase()
  const match = members.find(
    m =>
      String(m.id) === needle ||
      m.username?.toLowerCase() === needle ||
      m.email?.toLowerCase() === needle,
  )
  if (!match) {
    const available = members.map(m => m.username ?? m.email ?? String(m.id)).join(', ')
    throw new Error(`User "${ref}" not found. Available: ${available}`)
  }
  return { id: match.id, username: match.username ?? match.email ?? String(match.id) }
}

async function workspaceInfo(
  client: Pick<ClickUpClient, 'getTeams'>,
  teamId: string,
): Promise<{ id: string; name: string }> {
  const teams = await client.getTeams()
  const team = teams.find(t => t.id === teamId)
  return { id: teamId, name: team?.name ?? teamId }
}

function toDiscovered(task: Task): DiscoveredTask {
  return {
    id: task.id,
    listId: task.list.id,
    initiative: (task.custom_item_id ?? 0) !== 0,
  }
}

/** Union of task lists by id, first occurrence wins. */
function dedupe(tasks: Task[]): Task[] {
  const seen = new Set<string>()
  return tasks.filter(t => (seen.has(t.id) ? false : (seen.add(t.id), true)))
}

/**
 * Every task ever assigned to the user. ClickUp's team-task endpoint treats
 * `archived=true` as "only archived", so active and archived are fetched
 * separately and unioned.
 */
export async function discoverUserTasks(
  client: DiscoverClient,
  teamId: string,
  userRef: string,
): Promise<ExportPlan> {
  const user = await resolveUserRef(client, teamId, userRef)
  const base = { all: true, assignees: [user.id], includeClosed: true, subtasks: true }
  const [active, archived] = await Promise.all([
    client.getMyTasks(teamId, base),
    client.getMyTasks(teamId, { ...base, archived: true }),
  ])
  const all = dedupe([...active, ...archived])
  return {
    slice: { name: `user-${slug(user.username)}`, kind: 'user', scope: String(user.id) },
    tasks: all.map(toDiscovered),
    workspace: await workspaceInfo(client, teamId),
    tasksById: Object.fromEntries(all.map(t => [t.id, t])),
  }
}
