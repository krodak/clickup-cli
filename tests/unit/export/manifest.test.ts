import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadManifest, MANIFEST_VERSION, saveManifest } from '../../../src/export/manifest.js'

describe('manifest', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cup-manifest-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns an empty manifest when none exists', () => {
    const m = loadManifest(dir)
    expect(m).toEqual({
      version: MANIFEST_VERSION,
      workspace: undefined,
      tasks: {},
      docs: {},
      slices: {},
    })
  })

  it('round-trips through disk', () => {
    const m = loadManifest(dir)
    m.workspace = { id: 'ws1', name: 'krodak' }
    m.tasks['t1'] = { fetchedAt: '2026-08-30T10:00:00.000Z', slices: ['user-me'] }
    m.slices['user-me'] = {
      kind: 'user',
      scope: 'me',
      exportedAt: '2026-08-30T10:00:00.000Z',
      taskCount: 1,
    }
    saveManifest(dir, m)
    expect(loadManifest(dir)).toEqual(m)
  })

  it('writes atomically (no partial file left on disk)', () => {
    const m = loadManifest(dir)
    saveManifest(dir, m)
    expect(existsSync(join(dir, 'manifest.json'))).toBe(true)
    expect(existsSync(join(dir, 'manifest.json.tmp'))).toBe(false)
    expect(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).version).toBe(
      MANIFEST_VERSION,
    )
  })

  it('rejects a manifest from an incompatible version', () => {
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ version: 999, tasks: {} }))
    expect(() => loadManifest(dir)).toThrow(/manifest version 999/)
  })

  it('rejects a corrupt manifest with a clear message', () => {
    writeFileSync(join(dir, 'manifest.json'), '{not json')
    expect(() => loadManifest(dir)).toThrow(/manifest\.json/)
  })
})
