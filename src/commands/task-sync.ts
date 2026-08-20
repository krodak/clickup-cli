import { readdir } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import type { Config } from '../config.js'
import {
  discoverTaskFiles,
  looksLikeDirectoryTarget,
  pathIsDirectory,
} from '../task-sync/discover.js'
import { runTaskSyncDoctor as runDoctor } from '../task-sync/doctor.js'
import { parseMarkdownFile } from '../task-sync/frontmatter.js'
import { buildSyncGraph } from '../task-sync/graph.js'
import { pullTaskToFile } from '../task-sync/pull.js'
import { pushTaskFile } from '../task-sync/push.js'
import { taskSyncStatus } from '../task-sync/status.js'
import { pullSyncTree, pushSyncDir, rewriteLinkFrontmatter } from '../task-sync/tree.js'

export async function resolveSyncFile(explicit?: string): Promise<string> {
  if (explicit) return resolve(explicit)
  const entries = await readdir(process.cwd())
  const candidates: string[] = []
  for (const name of entries) {
    if (extname(name).toLowerCase() !== '.md') continue
    const { readFile } = await import('node:fs/promises')
    const raw = await readFile(join(process.cwd(), name), 'utf8')
    const parsed = parseMarkdownFile(raw)
    if (parsed.frontmatter.clickup_id) candidates.push(resolve(name))
  }
  if (candidates.length === 1) return candidates[0]!
  if (candidates.length === 0) {
    throw new Error(
      'No markdown file with clickup_id frontmatter in this directory. Pass a file path.',
    )
  }
  throw new Error(
    `Multiple synced markdown files found:\n${candidates.join('\n')}\nPass a file path.`,
  )
}

export async function runTaskSyncInit(
  config: Config,
  taskId: string,
  file: string | undefined,
  opts: { force?: boolean; dryRun?: boolean; noInput?: boolean; sessionToken?: string },
) {
  const dest = file ?? `${taskId}.md`
  if (await looksLikeDirectoryTarget(dest)) {
    return pullSyncTree(config, taskId, dest, opts)
  }
  return pullTaskToFile(config, taskId, dest, opts)
}

export async function runTaskSyncPush(
  config: Config,
  file: string | undefined,
  opts: {
    force?: boolean
    dryRun?: boolean
    noInput?: boolean
    list?: string
    create?: boolean
    title?: string
    mermaidTheme?: string
  },
) {
  if (file && (await pathIsDirectory(file))) {
    return pushSyncDir(config, file, opts)
  }
  if (!file) {
    const discovered = await discoverTaskFiles(process.cwd())
    if (discovered.length > 1) return pushSyncDir(config, process.cwd(), opts)
  }
  const dest = await resolveSyncFile(file)
  if (await pathIsDirectory(dest)) return pushSyncDir(config, dest, opts)
  return pushTaskFile(config, dest, opts)
}

export async function runTaskSyncPull(
  config: Config,
  file: string | undefined,
  opts: { force?: boolean; dryRun?: boolean; noInput?: boolean; sessionToken?: string },
) {
  if (file && (await pathIsDirectory(file))) {
    const files = await discoverTaskFiles(file)
    const roots = files.filter(f => !f.frontmatter.parent)
    if (roots.length === 1 && roots[0]?.frontmatter.clickup_id) {
      return pullSyncTree(config, roots[0].frontmatter.clickup_id, file, opts)
    }
    throw new Error(
      'Directory pull needs exactly one root task (no parent: in frontmatter) with clickup_id, or use: cup task-sync init <taskId> <dir>',
    )
  }
  const dest = await resolveSyncFile(file)
  const raw = await import('node:fs/promises').then(fs => fs.readFile(dest, 'utf8'))
  const parsed = parseMarkdownFile(raw)
  if (!parsed.frontmatter.clickup_id) {
    throw new Error(`No clickup_id in ${dest}`)
  }
  const result = await pullTaskToFile(config, parsed.frontmatter.clickup_id, dest, opts)
  if (!opts.dryRun) {
    const siblings = await discoverTaskFiles(dirname(dest))
    if (siblings.length > 1) {
      await rewriteLinkFrontmatter(buildSyncGraph(dirname(dest), siblings))
    }
  }
  return result
}

export async function runTaskSyncStatus(config: Config, file: string | undefined) {
  if (file && (await pathIsDirectory(file))) {
    const files = await discoverTaskFiles(file)
    return Promise.all(files.map(f => taskSyncStatus(config, f.file)))
  }
  if (!file) {
    const discovered = await discoverTaskFiles(process.cwd())
    if (discovered.length > 1) {
      return Promise.all(discovered.map(f => taskSyncStatus(config, f.file)))
    }
  }
  const dest = await resolveSyncFile(file)
  return taskSyncStatus(config, dest)
}

export async function runTaskSyncDoctor(
  config: Config,
  opts: {
    list: string
    file?: string
    deleteAfter?: boolean
    dryRun?: boolean
    sessionToken?: string
    mermaidTheme?: string
  },
) {
  return runDoctor(config, opts)
}
