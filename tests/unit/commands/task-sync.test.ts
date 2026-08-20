import { describe, expect, it } from 'vitest'
import { classifyConflict } from '../../../src/task-sync/conflict.js'
import { contentHash, sha1Buffer } from '../../../src/task-sync/hash.js'
import { cupFilename } from '../../../src/task-sync/media.js'

describe('task-sync helpers', () => {
  it('classifies conflict states', () => {
    expect(classifyConflict({ localDirty: false, remoteNewer: false })).toBe('none')
    expect(classifyConflict({ localDirty: true, remoteNewer: false })).toBe('local')
    expect(classifyConflict({ localDirty: false, remoteNewer: true })).toBe('remote')
    expect(classifyConflict({ localDirty: true, remoteNewer: true })).toBe('both')
  })

  it('hashes content stably', () => {
    expect(contentHash('abc', [])).toBe(contentHash('abc', []))
    expect(contentHash('abc', [])).not.toBe(contentHash('abd', []))
    expect(sha1Buffer('hi')).toHaveLength(40)
  })

  it('names uploaded blobs after their sha1', () => {
    expect(cupFilename('deadbeef', '.png')).toBe('cup-deadbeef.png')
    expect(cupFilename('abc', 'jpg')).toBe('cup-abc.jpg')
  })
})

describe('task-sync change detection', () => {
  it('isRemoteNewer ignores metadata-only updates when a description hash was recorded', async () => {
    const { isRemoteNewer } = await import('../../../src/task-sync/conflict.js')
    const { remoteDescriptionHash } = await import('../../../src/task-sync/hash.js')
    const remote = { date_updated: '200', description: 'hello' }
    const fm = { last_remote_date_updated: '100', last_remote_hash: remoteDescriptionHash(remote) }
    expect(isRemoteNewer(fm, remote)).toBe(false)
    expect(isRemoteNewer(fm, { ...remote, description: 'edited' })).toBe(true)
    expect(isRemoteNewer({ last_remote_date_updated: '100' }, remote)).toBe(true)
    expect(isRemoteNewer(fm, { ...remote, date_updated: '100' })).toBe(false)
    expect(isRemoteNewer({}, remote)).toBe(false)
  })

  it('localAssetHashes fingerprints referenced local images and skips remote/missing ones', async () => {
    const { mkdtemp, writeFile } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { localAssetHashes, contentHash } = await import('../../../src/task-sync/hash.js')
    const dir = await mkdtemp(join(tmpdir(), 'cup-assets-'))
    await writeFile(join(dir, 'a.png'), 'one')
    const body = '![a](a.png) ![r](https://x/y.png) <img src="a.png"> ![m](missing.png)'
    const first = await localAssetHashes(body, dir)
    expect(first).toHaveLength(2)
    const before = contentHash(body, first)
    await writeFile(join(dir, 'a.png'), 'two')
    const after = contentHash(body, await localAssetHashes(body, dir))
    expect(after).not.toBe(before)
  })

  it('writeMarkdownFileAtomic round-trips and leaves no temp file', async () => {
    const { mkdtemp, readdir, readFile } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { writeMarkdownFileAtomic, parseMarkdownFile } =
      await import('../../../src/task-sync/frontmatter.js')
    const dir = await mkdtemp(join(tmpdir(), 'cup-atomic-'))
    const file = join(dir, 't.md')
    await writeMarkdownFileAtomic(file, { title: 'x' }, '\n# H\n')
    expect(await readdir(dir)).toEqual(['t.md'])
    const parsed = parseMarkdownFile(await readFile(file, 'utf8'))
    expect(parsed.frontmatter.title).toBe('x')
    expect(parsed.body).toBe('\n# H\n')
  })
})
