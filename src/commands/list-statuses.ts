import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface StatusDefinition {
  status: string
  color: string
  type: string
}

function isNotFound(err: unknown): boolean {
  return err instanceof Error && /ClickUp API error 4(04|03)/.test(err.message)
}

export async function copyStatusesFrom(
  client: ClickUpClient,
  sourceId: string,
): Promise<StatusDefinition[]> {
  try {
    const list = await client.getListWithStatuses(sourceId)
    return list.statuses.map(s => ({ status: s.status, color: s.color, type: s.type ?? 'custom' }))
  } catch (err) {
    if (!isNotFound(err)) throw err
    try {
      const space = await client.getSpaceWithStatuses(sourceId)
      return space.statuses.map(s => ({
        status: s.status,
        color: s.color,
        type: s.type ?? 'custom',
      }))
    } catch (spaceErr) {
      if (!isNotFound(spaceErr)) throw spaceErr
      throw new Error(
        `Could not find a list or space with ID "${sourceId}". Check the ID and try again.`,
        { cause: spaceErr },
      )
    }
  }
}

const OPEN_COLOR = '#87909e'
const CLOSED_COLOR = '#008844'
const CUSTOM_COLORS = ['#5f55ee', '#f8ae00', '#1090e0', '#e16b16', '#ee5e99', '#b660e0', '#0f9d9f']
const STATUS_TYPES = ['open', 'custom', 'done', 'closed']

export function parseStatusNames(
  spec: string,
  current: Array<{ status: string; color: string }> = [],
): StatusDefinition[] {
  const entries = spec
    .split(',')
    .map(entry => entry.trim().toLowerCase())
    .filter(Boolean)
    .map(entry => {
      const separator = entry.lastIndexOf(':')
      const suffix = entry.slice(separator + 1).trim()
      const type = separator >= 0 && STATUS_TYPES.includes(suffix) ? suffix : undefined
      const name = type ? entry.slice(0, separator).trim() : entry
      return { name, type }
    })
  if (entries.length < 2) {
    throw new Error('Provide at least two statuses: the first is open, the last is closed')
  }
  const names = entries.map(e => e.name)
  const duplicate = names.find((name, i) => names.indexOf(name) !== i)
  if (duplicate) throw new Error(`Duplicate status "${duplicate}"`)

  const currentColors = new Map(current.map(s => [s.status.toLowerCase(), s.color]))
  const last = entries.length - 1
  return entries.map(({ name, type: explicit }, i) => {
    const type = explicit ?? (i === 0 ? 'open' : i === last ? 'closed' : 'custom')
    const fallback =
      type === 'open'
        ? OPEN_COLOR
        : type === 'custom'
          ? CUSTOM_COLORS[(i - 1) % CUSTOM_COLORS.length]!
          : CLOSED_COLOR
    return { status: name, type, color: currentColors.get(name) ?? fallback }
  })
}

export async function applyListStatuses(
  client: ClickUpClient,
  listId: string,
  statuses: StatusDefinition[],
): Promise<StatusDefinition[]> {
  await client.updateList(listId, { override_statuses: true, statuses })
  const after = await client.getListWithStatuses(listId)
  const expected = statuses.map(s => s.status.toLowerCase())
  const actual = after.statuses.map(s => s.status.toLowerCase())
  if (!after.override_statuses || expected.join('\n') !== actual.join('\n')) {
    throw new Error(
      `ClickUp did not apply the statuses to list ${listId}. Now: ${actual.join(', ') || '(none)'}`,
    )
  }
  return after.statuses.map(s => ({ status: s.status, color: s.color, type: s.type ?? 'custom' }))
}

export async function listStatuses(
  config: Config,
  listId: string,
  opts: { set?: string; copyFrom?: string },
): Promise<{ id: string; name: string; statuses: StatusDefinition[]; changed: boolean }> {
  if (opts.set && opts.copyFrom) throw new Error('Use either --set or --copy-from, not both')
  const client = new ClickUpClient(config)
  const list = await client.getListWithStatuses(listId)
  const current = list.statuses.map(s => ({
    status: s.status,
    color: s.color,
    type: s.type ?? 'custom',
  }))
  if (!opts.set && !opts.copyFrom) {
    return { id: list.id, name: list.name, statuses: current, changed: false }
  }

  const desired = opts.copyFrom
    ? await copyStatusesFrom(client, opts.copyFrom)
    : parseStatusNames(opts.set!, current)

  const kept = new Set(desired.map(s => s.status.toLowerCase()))
  const removed = new Set(
    current.map(s => s.status.toLowerCase()).filter(status => !kept.has(status)),
  )
  if (removed.size > 0) {
    const [active, archived] = await Promise.all([
      client.getTasksFromList(listId, {}, { includeClosed: true }),
      client.getTasksFromList(listId, {}, { includeClosed: true, archived: true }),
    ])
    const tasks = [...new Map([...active, ...archived].map(t => [t.id, t])).values()]
    const blocking = tasks.filter(t => removed.has(t.status.status.toLowerCase()))
    if (blocking.length > 0) {
      const used = [...new Set(blocking.map(t => t.status.status))].join(', ')
      throw new Error(
        `${blocking.length} task(s) in list ${listId} still use ${used}. Keep those names in --set (an old closed status as name:done), move the tasks, then set the final statuses.`,
      )
    }
  }

  const statuses = await applyListStatuses(client, listId, desired)
  return { id: list.id, name: list.name, statuses, changed: true }
}
