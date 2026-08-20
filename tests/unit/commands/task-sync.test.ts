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
