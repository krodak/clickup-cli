import type { ClickUpClient, Task } from '../api.js'
import type { DiscoveredTask, ExportPlan, SpaceHierarchy } from './engine.js'

export interface ResolvedUser {
  id: number
  username: string
}

type DiscoverClient = Pick<
  ClickUpClient,
  'getMe' | 'getWorkspaceMembers' | 'getMyTasks' | 'getTeams'
>

type TeamClient = Pick<
  ClickUpClient,
  'getTeams' | 'getSpaces' | 'getLists' | 'getFolders' | 'getFolderLists' | 'getTasksFromList'
>

type ListClient = Pick<ClickUpClient, 'getTeams' | 'getListWithStatuses' | 'getTasksFromList'>

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

/** A space by id or case-insensitive name. */
export async function resolveSpaceRef(
  client: Pick<ClickUpClient, 'getSpaces'>,
  teamId: string,
  ref: string,
): Promise<{ id: string; name: string }> {
  const spaces = await client.getSpaces(teamId)
  const needle = ref.trim().toLowerCase()
  const match = spaces.find(s => s.id === ref.trim() || s.name.toLowerCase() === needle)
  if (!match) {
    throw new Error(`Space "${ref}" not found. Available: ${spaces.map(s => s.name).join(', ')}`)
  }
  return { id: match.id, name: match.name }
}

/**
 * Every task in a list, active and archived (the list endpoint's
 * `archived=true` also means "only archived").
 */
async function listTasks(client: Pick<ClickUpClient, 'getTasksFromList'>, listId: string) {
  const [active, archived] = await Promise.all([
    client.getTasksFromList(listId, {}, { includeClosed: true }),
    client.getTasksFromList(listId, {}, { includeClosed: true, archived: true }),
  ])
  return dedupe([...active, ...archived])
}

async function union<T extends { id: string }>(
  active: Promise<T[]>,
  archived: Promise<T[]>,
): Promise<T[]> {
  const [a, b] = await Promise.all([active, archived])
  const seen = new Set<string>()
  return [...a, ...b].filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)))
}

/** Every list in a space, folderless and foldered, including archived containers. */
export async function walkSpace(client: TeamClient, spaceId: string, spaceName: string) {
  const [lists, folders] = await Promise.all([
    union(client.getLists(spaceId, false), client.getLists(spaceId, true)),
    union(client.getFolders(spaceId, false), client.getFolders(spaceId, true)),
  ])
  const folderEntries = await Promise.all(
    folders.map(async f => ({
      id: f.id,
      name: f.name,
      lists: (
        await union(client.getFolderLists(f.id, false), client.getFolderLists(f.id, true))
      ).map(l => ({ id: l.id, name: l.name })),
    })),
  )
  const hierarchy: SpaceHierarchy = {
    space: { id: spaceId, name: spaceName },
    folders: folderEntries,
    lists: lists.map(l => ({ id: l.id, name: l.name })),
  }
  return hierarchy
}

/** Every task in every list of a space. */
export async function discoverTeamTasks(
  client: TeamClient,
  teamId: string,
  spaceRef: string,
): Promise<ExportPlan> {
  const space = await resolveSpaceRef(client, teamId, spaceRef)
  const hierarchy = await walkSpace(client, space.id, space.name)
  const listIds = [
    ...hierarchy.lists.map(l => l.id),
    ...hierarchy.folders.flatMap(f => f.lists.map(l => l.id)),
  ]
  const perList = await Promise.all(listIds.map(id => listTasks(client, id)))
  const all = dedupe(perList.flat())
  return {
    slice: { name: `team-${slug(space.name)}`, kind: 'team', scope: space.id },
    tasks: all.map(toDiscovered),
    workspace: await workspaceInfo(client, teamId),
    tasksById: Object.fromEntries(all.map(t => [t.id, t])),
    hierarchy,
  }
}

export interface ListDiscoveryOptions {
  kind: 'roadmap' | 'initiatives'
  /** Required for `initiatives`: the custom_item_id that marks an initiative. */
  initiativeItemId?: number
}

/**
 * Every task in one list (roadmap), or only the initiative-typed tasks in it
 * (initiatives; their subtask trees are picked up by the engine walk).
 */
export async function discoverListTasks(
  client: ListClient,
  teamId: string,
  listId: string,
  opts: ListDiscoveryOptions,
): Promise<ExportPlan> {
  const list = await client.getListWithStatuses(listId)
  let all = await listTasks(client, listId)
  if (opts.kind === 'initiatives') {
    const itemId = opts.initiativeItemId
    if (itemId === undefined) throw new Error('initiatives export requires an initiative item id')
    const matching = all.filter(t => t.custom_item_id === itemId)
    if (matching.length === 0) {
      const found = [...new Set(all.map(t => t.custom_item_id ?? 0).filter(id => id !== 0))]
        .sort((a, b) => a - b)
        .join(', ')
      throw new Error(
        `No tasks with custom item id ${itemId} in list "${list.name}" (custom item ids found: ${found || 'none'})`,
      )
    }
    all = matching
  }
  return {
    slice: { name: `${opts.kind}-${slug(list.name)}`, kind: opts.kind, scope: listId },
    tasks: all.map(toDiscovered),
    workspace: await workspaceInfo(client, teamId),
    tasksById: Object.fromEntries(all.map(t => [t.id, t])),
    list: { id: list.id, name: list.name },
  }
}
