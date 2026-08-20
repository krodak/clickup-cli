import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { ClickUpClient, type Task } from '../api.js'
import type { Config } from '../config.js'
import { discoverTaskFiles, slugTitle } from './discover.js'
import { parseMarkdownFile, stringifyMarkdownFile } from './frontmatter.js'
import type { TaskSyncFrontmatter } from './frontmatter.js'
import { buildSyncGraph, createOrder, relativeRef, resolveNodeRef } from './graph.js'
import type { SyncGraph } from './graph.js'
import { pullTaskToFile } from './pull.js'
import type { PullOptions, PullResult } from './pull.js'
import { pushTaskFile } from './push.js'
import type { PushOptions, PushResult } from './push.js'

export interface PushTreeResult {
  action: 'tree'
  results: PushResult[]
  warnings: string[]
}

export async function pushSyncDir(
  config: Config,
  dir: string,
  opts: PushOptions = {},
): Promise<PushTreeResult> {
  const root = resolve(dir)
  const files = await discoverTaskFiles(root)
  if (files.length === 0) {
    throw new Error(`No task markdown files found in ${root}`)
  }
  const graph = buildSyncGraph(root, files)
  const order = createOrder(graph)
  const results: PushResult[] = []

  for (const node of order) {
    const parentFile = graph.parentOf.get(node.file)
    let parentId: string | null | undefined
    if (parentFile) parentId = await readClickupId(parentFile)
    else if (node.frontmatter.parent === null) parentId = null
    else if (node.frontmatter.parent) {
      parentId = (await resolveToClickupId(graph, node.file, node.frontmatter.parent)) ?? undefined
    }
    const listId =
      opts.list ??
      node.frontmatter.list_id ??
      (parentFile ? (await readFrontmatter(parentFile)).list_id : undefined)
    const result = await pushTaskFile(config, node.file, {
      ...opts,
      create: true,
      list: listId,
      parentId,
    })
    results.push(result)
    if (result.taskId && result.taskId !== '(new)') {
      node.frontmatter.clickup_id = result.taskId
    }
  }

  if (!opts.dryRun) {
    await syncDependencies(config, graph)
    await rewriteLinkFrontmatter(graph)
  }

  return { action: 'tree', results, warnings: graph.warnings }
}

export interface PullTreeResult {
  action: 'tree'
  root: PullResult
  children: PullResult[]
  warnings: string[]
}

export async function pullSyncTree(
  config: Config,
  taskId: string,
  dir: string,
  opts: PullOptions = {},
): Promise<PullTreeResult> {
  const root = resolve(dir)
  await mkdir(root, { recursive: true })
  const client = new ClickUpClient(config)
  const existing = await mapExistingIds(root)
  const children: PullResult[] = []
  const seen = new Set<string>()
  const claimed = new Set<string>(existing.values())

  const written = await pullTaskAndChildren(
    config,
    client,
    taskId,
    root,
    existing,
    claimed,
    seen,
    opts,
    children,
  )
  const graph = buildSyncGraph(root, await discoverTaskFiles(root))
  if (!opts.dryRun) await rewriteLinkFrontmatter(graph)
  return { action: 'tree', root: written, children, warnings: graph.warnings }
}

async function pullTaskAndChildren(
  config: Config,
  client: ClickUpClient,
  taskId: string,
  dir: string,
  existing: Map<string, string>,
  claimed: Set<string>,
  seen: Set<string>,
  opts: PullOptions,
  children: PullResult[],
): Promise<PullResult> {
  if (seen.has(taskId)) {
    const dest = existing.get(taskId)
    if (!dest) throw new Error(`Cycle while pulling task ${taskId}`)
    return { action: opts.dryRun ? 'dry-run' : 'written', taskId, file: dest, lossless: false }
  }
  seen.add(taskId)

  const task = await client.getTask(taskId)
  const dest = await destForTask(task, dir, existing, claimed)
  const result = await pullTaskToFile(config, task.id, dest, opts)
  existing.set(task.id, dest)
  claimed.add(dest)

  if (opts.dryRun) return result

  const subtasks = await client.getTasksFromList(
    task.list.id,
    { parent: task.id, subtasks: 'false' },
    { includeClosed: true },
  )
  const childFiles: string[] = []
  for (const sub of subtasks) {
    if (seen.has(sub.id)) continue
    const child = await pullTaskAndChildren(
      config,
      client,
      sub.id,
      dir,
      existing,
      claimed,
      seen,
      opts,
      children,
    )
    children.push(child)
    childFiles.push(relativeRef(dest, child.file))
  }
  if (childFiles.length > 0) {
    const again = parseMarkdownFile(await readFile(dest, 'utf8'))
    again.frontmatter.subtasks = childFiles
    await writeFile(dest, stringifyMarkdownFile(again.frontmatter, again.body))
  }
  return result
}

async function destForTask(
  task: Pick<Task, 'id' | 'name'>,
  dir: string,
  existing: Map<string, string>,
  claimed: Set<string>,
): Promise<string> {
  const known = existing.get(task.id)
  if (known) return known
  const slug = slugTitle(task.name)
  const candidates = [
    join(dir, `${slug}.md`),
    join(dir, `${slug}-${task.id}.md`),
    join(dir, `${task.id}.md`),
  ]
  for (const dest of candidates) {
    if (claimed.has(dest)) continue
    try {
      const parsed = parseMarkdownFile(await readFile(dest, 'utf8'))
      if (parsed.frontmatter.clickup_id && parsed.frontmatter.clickup_id !== task.id) continue
    } catch {
      /* new file */
    }
    return dest
  }
  return join(dir, `${task.id}.md`)
}

async function mapExistingIds(dir: string): Promise<Map<string, string>> {
  try {
    const files = await discoverTaskFiles(dir)
    const map = new Map<string, string>()
    for (const f of files) {
      if (f.frontmatter.clickup_id) map.set(f.frontmatter.clickup_id, f.file)
    }
    return map
  } catch {
    return new Map()
  }
}

async function syncDependencies(config: Config, graph: SyncGraph): Promise<void> {
  const client = new ClickUpClient(config)
  for (const node of graph.nodes.values()) {
    const fromId = await readClickupId(node.file)
    if (!fromId) continue
    for (const ref of node.frontmatter.depends_on ?? []) {
      const toId = await resolveToClickupId(graph, node.file, ref)
      if (!toId) {
        graph.warnings.push(`${node.rel}: depends_on '${ref}' has no ClickUp id yet`)
        continue
      }
      try {
        await client.addDependency(fromId, { dependsOn: toId })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!/already/i.test(msg)) graph.warnings.push(`${node.rel}: depends_on ${ref}: ${msg}`)
      }
    }
    for (const ref of node.frontmatter.blocks ?? []) {
      const otherId = await resolveToClickupId(graph, node.file, ref)
      if (!otherId) {
        graph.warnings.push(`${node.rel}: blocks '${ref}' has no ClickUp id yet`)
        continue
      }
      try {
        await client.addDependency(fromId, { dependencyOf: otherId })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!/already/i.test(msg)) graph.warnings.push(`${node.rel}: blocks ${ref}: ${msg}`)
      }
    }
  }
}

async function resolveToClickupId(
  graph: SyncGraph,
  fromFile: string,
  ref: string,
): Promise<string | undefined> {
  const resolved = resolveNodeRef(graph, fromFile, ref)
  if (resolved.id) return resolved.id
  if (resolved.file) return readClickupId(resolved.file)
  return undefined
}

export async function rewriteLinkFrontmatter(graph: SyncGraph): Promise<void> {
  for (const node of graph.nodes.values()) {
    const raw = await readFile(node.file, 'utf8')
    const parsed = parseMarkdownFile(raw)
    const parentFile = graph.parentOf.get(node.file)
    if (parentFile) {
      parsed.frontmatter.parent = relativeRef(node.file, parentFile)
    } else if (parsed.frontmatter.parent === null) {
      parsed.frontmatter.parent = null
    } else if (typeof parsed.frontmatter.parent !== 'string') {
      delete parsed.frontmatter.parent
    }

    const kids = graph.childrenOf.get(node.file) ?? []
    if (kids.length > 0) parsed.frontmatter.subtasks = kids.map(c => relativeRef(node.file, c))
    else delete parsed.frontmatter.subtasks

    const depends = (parsed.frontmatter.depends_on ?? []).map(ref =>
      localizeRef(graph, node.file, ref),
    )
    if (depends.length > 0) parsed.frontmatter.depends_on = depends
    else delete parsed.frontmatter.depends_on

    const blocking = (parsed.frontmatter.blocks ?? []).map(ref =>
      localizeRef(graph, node.file, ref),
    )
    if (blocking.length > 0) parsed.frontmatter.blocks = blocking
    else delete parsed.frontmatter.blocks

    await writeFile(node.file, stringifyMarkdownFile(parsed.frontmatter, parsed.body))
  }
}

function localizeRef(graph: SyncGraph, fromFile: string, ref: string): string {
  const resolved = resolveNodeRef(graph, fromFile, ref)
  if (resolved.file && graph.nodes.has(resolved.file)) return relativeRef(fromFile, resolved.file)
  return ref
}

async function readClickupId(file: string): Promise<string | undefined> {
  return (await readFrontmatter(file)).clickup_id
}

async function readFrontmatter(file: string): Promise<TaskSyncFrontmatter> {
  const parsed = parseMarkdownFile(await readFile(file, 'utf8'))
  return parsed.frontmatter
}
