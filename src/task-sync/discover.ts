import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import { parseMarkdownFile } from './frontmatter.js'
import type { ParsedMarkdownFile, TaskSyncFrontmatter } from './frontmatter.js'

const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'dist'])

export interface DiscoveredTaskFile extends ParsedMarkdownFile {
  file: string
  rel: string
}

export async function pathIsDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

export async function looksLikeDirectoryTarget(path: string): Promise<boolean> {
  if (await pathIsDirectory(path)) return true
  const lower = path.toLowerCase()
  if (lower.endsWith('.md')) return false
  if (path.endsWith('/') || path.endsWith(sep)) return true
  try {
    await stat(path)
    return false
  } catch {
    return !lower.endsWith('.md')
  }
}

export function isTaskMarkdown(fm: TaskSyncFrontmatter): boolean {
  return Boolean(
    fm.clickup_id ||
    fm.title ||
    fm.list_id ||
    fm.parent ||
    (fm.subtasks && fm.subtasks.length > 0) ||
    (fm.depends_on && fm.depends_on.length > 0) ||
    (fm.blocks && fm.blocks.length > 0),
  )
}

export async function discoverTaskFiles(rootDir: string): Promise<DiscoveredTaskFile[]> {
  const absRoot = resolve(rootDir)
  const files = await walkMarkdown(absRoot)
  const out: DiscoveredTaskFile[] = []
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const parsed = parseMarkdownFile(source)
    if (!isTaskMarkdown(parsed.frontmatter)) continue
    out.push({
      file,
      rel: toPosix(relative(absRoot, file)),
      frontmatter: parsed.frontmatter,
      body: parsed.body,
    })
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel))
}

async function walkMarkdown(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name) || entry.name.endsWith('.assets')) continue
      files.push(...(await walkMarkdown(full)))
      continue
    }
    if (extname(entry.name).toLowerCase() === '.md') files.push(full)
  }
  return files
}

export function toPosix(path: string): string {
  return path.split(sep).join('/')
}

export function slugTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'task'
}
