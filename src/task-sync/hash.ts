import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

export function sha1Buffer(data: Buffer | string): string {
  return createHash('sha1').update(data).digest('hex')
}

export async function sha1File(path: string): Promise<string> {
  const buf = await readFile(path)
  return sha1Buffer(buf)
}

export function contentHash(body: string, fileHashes: string[]): string {
  const h = createHash('sha1')
  h.update(body)
  for (const extra of fileHashes) h.update(extra)
  return h.digest('hex')
}
