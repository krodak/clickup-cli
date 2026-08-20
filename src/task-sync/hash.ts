import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'

export function sha1Buffer(data: Buffer | string): string {
  return createHash('sha1').update(data).digest('hex')
}

export async function sha1File(path: string): Promise<string> {
  const buf = await readFile(path)
  return sha1Buffer(buf)
}

const LOCAL_IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<img[^>]+src=["']([^"']+)["']/gi

/**
 * sha1 of every local image file referenced from `body`, sorted so the result
 * is stable. Missing files are skipped (the compiler reports those). Feeds
 * `contentHash` so editing a referenced image counts as a local change.
 */
export async function localAssetHashes(body: string, baseDir: string): Promise<string[]> {
  const hashes: string[] = []
  for (const m of body.matchAll(LOCAL_IMAGE_RE)) {
    const src = m[1] ?? m[2]
    if (!src || /^(?:[a-z][a-z0-9+.-]*:|\/\/|data:)/i.test(src)) continue
    try {
      hashes.push(await sha1File(isAbsolute(src) ? src : resolve(baseDir, src)))
    } catch {
      /* missing file */
    }
  }
  return hashes.sort()
}

/** Fingerprint of the remote description, used to tell content edits from metadata-only updates. */
export function remoteDescriptionHash(task: {
  description?: string
  markdown_description?: string
}): string {
  return sha1Buffer(task.description ?? '')
}

export function contentHash(body: string, fileHashes: string[]): string {
  const h = createHash('sha1')
  h.update(body)
  for (const extra of fileHashes) h.update(extra)
  return h.digest('hex')
}
