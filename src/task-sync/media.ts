import { readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, resolve } from 'node:path'
import type { ClickUpClient } from '../api.js'
import { sha1Buffer, sha1File } from './hash.js'

export interface MediaEntry {
  local: string
  uploaded_name: string
  attachment_id?: string
  url?: string
  width?: number
}

export type MediaIndex = Record<string, MediaEntry>

export function mediaIndexPath(markdownPath: string): string {
  const dir = dirname(markdownPath)
  const stem = markdownPath.slice(dir.length + 1).replace(/\.md$/i, '')
  return join(dir, `${stem}.cup-media.json`)
}

export async function loadMediaIndex(markdownPath: string): Promise<MediaIndex> {
  try {
    const raw = await readFile(mediaIndexPath(markdownPath), 'utf8')
    const parsed = JSON.parse(raw) as { images?: MediaIndex }
    return parsed.images ?? (parsed as MediaIndex)
  } catch {
    return {}
  }
}

export async function saveMediaIndex(markdownPath: string, images: MediaIndex): Promise<void> {
  const payload = { images }
  await writeFile(mediaIndexPath(markdownPath), JSON.stringify(payload, null, 2) + '\n')
}

export function cupFilename(sha1: string, ext: string): string {
  const clean = ext.replace(/^\./, '') || 'bin'
  return `cup-${sha1}.${clean}`
}

export function isRemoteSrc(src: string): boolean {
  return /^(https?:)?\/\//i.test(src) || src.startsWith('data:')
}

export async function uploadLocalImage(
  client: ClickUpClient,
  taskId: string,
  filePath: string,
  index: MediaIndex,
): Promise<MediaEntry> {
  const sha = await sha1File(filePath)
  const existing = index[sha]
  if (existing?.url) return existing
  const existingRemote = await findExistingAttachment(client, taskId, sha)
  if (existingRemote) {
    const entry: MediaEntry = {
      local: filePath,
      uploaded_name: existingRemote.title,
      attachment_id: existingRemote.id,
      url: existingRemote.url,
    }
    index[sha] = entry
    return entry
  }
  const name = cupFilename(sha, extname(filePath))
  const attachment = await client.createTaskAttachment(taskId, filePath, name)
  const entry: MediaEntry = {
    local: filePath,
    uploaded_name: name,
    attachment_id: attachment.id,
    url: attachment.url,
  }
  index[sha] = entry
  return entry
}

export async function uploadBytes(
  client: ClickUpClient,
  taskId: string,
  bytes: Buffer,
  ext: string,
  index: MediaIndex,
  localHint: string,
): Promise<MediaEntry> {
  const sha = sha1Buffer(bytes)
  const existing = index[sha]
  if (existing?.url) return existing
  const existingRemote = await findExistingAttachment(client, taskId, sha)
  if (existingRemote) {
    const entry: MediaEntry = {
      local: localHint,
      uploaded_name: existingRemote.title,
      attachment_id: existingRemote.id,
      url: existingRemote.url,
    }
    index[sha] = entry
    return entry
  }
  const { mkdtemp } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const dir = await mkdtemp(join(tmpdir(), 'cup-media-'))
  const name = cupFilename(sha, ext)
  const path = join(dir, name)
  await writeFile(path, bytes)
  const attachment = await client.createTaskAttachment(taskId, path, name)
  const entry: MediaEntry = {
    local: localHint,
    uploaded_name: name,
    attachment_id: attachment.id,
    url: attachment.url,
  }
  index[sha] = entry
  return entry
}

async function findExistingAttachment(
  client: ClickUpClient,
  taskId: string,
  sha: string,
): Promise<{ id: string; title: string; url: string } | undefined> {
  try {
    const attachments = await client.listTaskAttachmentsV3(taskId)
    const prefix = `cup-${sha}.`
    const hit = attachments.find(a => a.title.startsWith(prefix) || a.title === `cup-${sha}`)
    if (!hit) return undefined
    return { id: hit.id, title: hit.title, url: hit.url }
  } catch {
    return undefined
  }
}

export function resolveLocalPath(src: string, baseDir: string): string {
  if (isAbsolute(src)) return src
  return resolve(baseDir, src)
}
