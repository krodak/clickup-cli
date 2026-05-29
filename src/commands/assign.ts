import { ClickUpClient } from '../api.js'
import type { Task, UpdateTaskOptions, UserGroup } from '../api.js'
import type { Config } from '../config.js'
import { resolveAssigneeId, resolveGroupId } from './update.js'

interface AssignOptions {
  to?: string
  remove?: string
  group?: string
  removeGroup?: string
  json?: boolean
}

function parseIdList(value: string): string[] {
  return value
    .split(',')
    .map(v => v.trim())
    .filter(v => v.length > 0)
}

function createGroupCache(client: ClickUpClient): (value: string) => Promise<string> {
  let cache: UserGroup[] | null = null
  const cachingClient = {
    getGroups: async (): Promise<UserGroup[]> => {
      if (cache === null) cache = await client.getGroups()
      return cache
    },
  } as ClickUpClient
  return (value: string) => resolveGroupId(cachingClient, value)
}

export async function assignTask(
  config: Config,
  taskId: string,
  opts: AssignOptions,
): Promise<Task> {
  if (!opts.to && !opts.remove && !opts.group && !opts.removeGroup) {
    throw new Error('Provide at least one of: --to, --remove, --group, --remove-group')
  }

  const client = new ClickUpClient(config)
  const resolveGroup = createGroupCache(client)

  const add: number[] = []
  const rem: number[] = []
  const groupAdd: string[] = []
  const groupRem: string[] = []

  if (opts.to) {
    for (const value of parseIdList(opts.to)) {
      add.push(await resolveAssigneeId(client, value))
    }
  }
  if (opts.remove) {
    for (const value of parseIdList(opts.remove)) {
      rem.push(await resolveAssigneeId(client, value))
    }
  }
  if (opts.group) {
    for (const value of parseIdList(opts.group)) {
      groupAdd.push(await resolveGroup(value))
    }
  }
  if (opts.removeGroup) {
    for (const value of parseIdList(opts.removeGroup)) {
      groupRem.push(await resolveGroup(value))
    }
  }

  const payload: UpdateTaskOptions = {}
  if (add.length > 0 || rem.length > 0) {
    payload.assignees = {
      ...(add.length > 0 ? { add } : {}),
      ...(rem.length > 0 ? { rem } : {}),
    }
  }
  if (groupAdd.length > 0 || groupRem.length > 0) {
    payload.group_assignees = {
      ...(groupAdd.length > 0 ? { add: groupAdd } : {}),
      ...(groupRem.length > 0 ? { rem: groupRem } : {}),
    }
  }

  return client.updateTask(taskId, payload)
}
