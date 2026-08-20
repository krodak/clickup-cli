import { rename, writeFile } from 'node:fs/promises'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

/** Write via a sibling temp file + rename so a crash never leaves a truncated markdown file. */
export async function writeMarkdownFileAtomic(
  path: string,
  frontmatter: TaskSyncFrontmatter,
  body: string,
): Promise<void> {
  const tmp = `${path}.${process.pid}.tmp`
  await writeFile(tmp, stringifyMarkdownFile(frontmatter, body))
  await rename(tmp, path)
}

export interface TaskSyncFrontmatter {
  clickup_id?: string
  clickup_url?: string
  title?: string
  list_id?: string
  parent?: string | null
  subtasks?: string[]
  depends_on?: string[]
  blocks?: string[]
  last_sync_at?: string
  last_sync_sha?: string | null
  last_remote_date_updated?: string
  /** Fingerprint of the remote description at last sync (see remoteDescriptionHash). */
  last_remote_hash?: string
  content_hash?: string
  [key: string]: unknown
}

export interface ParsedMarkdownFile {
  frontmatter: TaskSyncFrontmatter
  body: string
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function parseMarkdownFile(source: string): ParsedMarkdownFile {
  const match = FM_RE.exec(source)
  if (!match) {
    return { frontmatter: {}, body: source }
  }
  const raw = parseYaml(match[1] ?? '') as unknown
  const frontmatter = isPlainObject(raw) ? normalizeParsedFrontmatter(raw) : {}
  const body = source.slice(match[0].length)
  return { frontmatter, body }
}

export function asStringList(value: unknown): string[] {
  if (value === undefined || value === null) return []
  if (typeof value === 'string') return value.trim() === '' ? [] : [value]
  if (typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item
      if (typeof item === 'number') return String(item)
      throw new Error('frontmatter list fields must be a string or an array of strings')
    })
  }
  throw new Error('frontmatter list fields must be a string or an array of strings')
}

function asParent(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  throw new Error('frontmatter parent must be a string, null, or omitted')
}

function normalizeParsedFrontmatter(raw: Record<string, unknown>): TaskSyncFrontmatter {
  const fm = { ...raw } as TaskSyncFrontmatter
  if (raw.subtasks !== undefined) fm.subtasks = asStringList(raw.subtasks)
  if (raw.depends_on !== undefined) fm.depends_on = asStringList(raw.depends_on)
  if (raw.blocks !== undefined) fm.blocks = asStringList(raw.blocks)
  if (raw.parent !== undefined) fm.parent = asParent(raw.parent)
  return fm
}

export function orderedFrontmatter(fm: TaskSyncFrontmatter): TaskSyncFrontmatter {
  const {
    clickup_id,
    clickup_url,
    title,
    list_id,
    parent,
    subtasks,
    depends_on,
    blocks,
    last_sync_at,
    last_sync_sha,
    last_remote_date_updated,
    content_hash,
    ...rest
  } = fm
  const out: TaskSyncFrontmatter = {}
  if (clickup_id !== undefined) out.clickup_id = clickup_id
  if (clickup_url !== undefined) out.clickup_url = clickup_url
  if (title !== undefined) out.title = title
  if (list_id !== undefined) out.list_id = list_id
  if (parent !== undefined) out.parent = parent
  if (subtasks !== undefined) out.subtasks = subtasks
  if (depends_on !== undefined) out.depends_on = depends_on
  if (blocks !== undefined) out.blocks = blocks
  Object.assign(out, rest)
  if (last_sync_at !== undefined) out.last_sync_at = last_sync_at
  if (last_sync_sha !== undefined) out.last_sync_sha = last_sync_sha
  if (last_remote_date_updated !== undefined)
    out.last_remote_date_updated = last_remote_date_updated
  if (content_hash !== undefined) out.content_hash = content_hash
  return out
}

export function stringifyMarkdownFile(frontmatter: TaskSyncFrontmatter, body: string): string {
  const yaml = stringifyYaml(orderedFrontmatter(frontmatter)).trimEnd()
  // Emit the body verbatim after the closing fence so that
  // parseMarkdownFile(stringifyMarkdownFile(fm, body)).body === body; otherwise a
  // body with a leading blank line re-parses differently and content_hash never matches.
  const withNl = body === '' || body.endsWith('\n') ? body : `${body}\n`
  return `---\n${yaml}\n---\n${withNl}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
