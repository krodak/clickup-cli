import { dirname, relative, resolve } from 'node:path'
import type { DiscoveredTaskFile } from './discover.js'
import { toPosix } from './discover.js'

export interface SyncGraph {
  rootDir: string
  nodes: Map<string, DiscoveredTaskFile>
  /** child abs path -> parent abs path */
  parentOf: Map<string, string>
  /** parent abs path -> children abs paths in declared order */
  childrenOf: Map<string, string[]>
  warnings: string[]
}

export function buildSyncGraph(rootDir: string, files: DiscoveredTaskFile[]): SyncGraph {
  const nodes = new Map(files.map(f => [f.file, f]))
  const byRel = new Map(files.map(f => [f.rel, f]))
  const byId = new Map<string, DiscoveredTaskFile>()
  for (const f of files) {
    if (f.frontmatter.clickup_id) byId.set(f.frontmatter.clickup_id, f)
  }

  const warnings: string[] = []
  const parentOf = new Map<string, string>()
  const childrenFromParentField = new Map<string, string[]>()
  const childrenFromSubtasksField = new Map<string, string[]>()

  for (const child of files) {
    const parentRef = child.frontmatter.parent
    if (!parentRef) continue
    const resolved = resolveRef(child.file, parentRef, rootDir, byRel, byId)
    if (!resolved.file || !nodes.has(resolved.file)) {
      warnings.push(
        `${child.rel}: parent '${parentRef}' is not a local file (will use as ClickUp id)`,
      )
      continue
    }
    if (resolved.file === child.file) {
      warnings.push(`${child.rel}: parent points at itself; ignoring`)
      continue
    }
    parentOf.set(child.file, resolved.file)
    pushChild(childrenFromParentField, resolved.file, child.file)
  }

  for (const parent of files) {
    for (const ref of parent.frontmatter.subtasks ?? []) {
      const resolved = resolveRef(parent.file, ref, rootDir, byRel, byId)
      if (!resolved.file || !nodes.has(resolved.file)) {
        warnings.push(
          `${parent.rel}: subtask '${ref}' is not a local file (will use as ClickUp id)`,
        )
        continue
      }
      if (resolved.file === parent.file) continue
      pushChild(childrenFromSubtasksField, parent.file, resolved.file)
      const existing = parentOf.get(resolved.file)
      if (existing && existing !== parent.file) {
        warnings.push(
          `${relOf(resolved.file, nodes)}: parent is ${relOf(existing, nodes)} but ${parent.rel} also lists it as a subtask; keeping child's parent:`,
        )
        continue
      }
      if (!existing) parentOf.set(resolved.file, parent.file)
    }
  }

  const childrenOf = new Map<string, string[]>()
  for (const parent of files) {
    const fromList = childrenFromSubtasksField.get(parent.file) ?? []
    const fromChild = childrenFromParentField.get(parent.file) ?? []
    const ordered: string[] = []
    const seen = new Set<string>()
    for (const c of [...fromList, ...fromChild]) {
      if (parentOf.get(c) !== parent.file) continue
      if (seen.has(c)) continue
      seen.add(c)
      ordered.push(c)
    }
    if (ordered.length > 0) childrenOf.set(parent.file, ordered)
  }

  detectCycles(parentOf, nodes)

  return { rootDir, nodes, parentOf, childrenOf, warnings }
}

export function createOrder(graph: SyncGraph): DiscoveredTaskFile[] {
  const incoming = new Map<string, number>()
  for (const file of graph.nodes.keys()) incoming.set(file, 0)
  for (const [child, parent] of graph.parentOf) {
    if (!graph.nodes.has(parent)) continue
    incoming.set(child, (incoming.get(child) ?? 0) + 1)
  }
  const queue = [...graph.nodes.keys()].filter(f => (incoming.get(f) ?? 0) === 0).sort()
  const out: DiscoveredTaskFile[] = []
  while (queue.length > 0) {
    const file = queue.shift()!
    const node = graph.nodes.get(file)
    if (node) out.push(node)
    for (const child of graph.childrenOf.get(file) ?? []) {
      const next = (incoming.get(child) ?? 1) - 1
      incoming.set(child, next)
      if (next === 0) queue.push(child)
    }
  }
  if (out.length !== graph.nodes.size) {
    throw new Error('Cycle detected in parent/subtask frontmatter')
  }
  return out
}

export interface ResolvedRef {
  file?: string
  id?: string
}

export function resolveRef(
  fromFile: string,
  ref: string,
  rootDir: string,
  byRel: Map<string, DiscoveredTaskFile>,
  byId: Map<string, DiscoveredTaskFile>,
): ResolvedRef {
  const trimmed = ref.trim()
  if (!trimmed) return {}
  if (isPathRef(trimmed)) {
    const abs = resolve(dirname(fromFile), trimmed)
    const rel = toPosix(relative(rootDir, abs))
    const hit = byRel.get(rel)
    if (hit) return { file: hit.file, id: hit.frontmatter.clickup_id }
    return { file: abs }
  }
  const byIdHit = byId.get(trimmed)
  if (byIdHit) return { file: byIdHit.file, id: trimmed }
  return { id: trimmed }
}

export function resolveNodeRef(graph: SyncGraph, fromFile: string, ref: string): ResolvedRef {
  const byRel = new Map([...graph.nodes.values()].map(f => [f.rel, f]))
  const byId = new Map<string, DiscoveredTaskFile>()
  for (const f of graph.nodes.values()) {
    if (f.frontmatter.clickup_id) byId.set(f.frontmatter.clickup_id, f)
  }
  return resolveRef(fromFile, ref, graph.rootDir, byRel, byId)
}

export function relativeRef(fromFile: string, toFile: string): string {
  let rel = toPosix(relative(dirname(fromFile), toFile))
  if (!rel.startsWith('.')) rel = `./${rel}`
  return rel
}

export function isPathRef(ref: string): boolean {
  return ref.endsWith('.md') || ref.includes('/') || ref.includes('\\') || ref.startsWith('.')
}

function pushChild(map: Map<string, string[]>, parent: string, child: string): void {
  const list = map.get(parent) ?? []
  if (!list.includes(child)) list.push(child)
  map.set(parent, list)
}

function relOf(file: string, nodes: Map<string, DiscoveredTaskFile>): string {
  return nodes.get(file)?.rel ?? file
}

function detectCycles(parentOf: Map<string, string>, nodes: Map<string, DiscoveredTaskFile>): void {
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (file: string, stack: string[]): void => {
    if (visited.has(file)) return
    if (visiting.has(file)) {
      throw new Error(`Cycle in parent chain: ${[...stack, relOf(file, nodes)].join(' -> ')}`)
    }
    visiting.add(file)
    const parent = parentOf.get(file)
    if (parent) visit(parent, [...stack, relOf(file, nodes)])
    visiting.delete(file)
    visited.add(file)
  }
  for (const file of parentOf.keys()) visit(file, [])
}
