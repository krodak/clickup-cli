import { describe, expect, it } from 'vitest'
import { renderRootReadme } from '../../../src/export/root-readme.js'
import { emptyManifest } from '../../../src/export/manifest.js'

describe('renderRootReadme', () => {
  it('lists task slices in the table and links docs separately', () => {
    const m = emptyManifest()
    m.workspace = { id: 'ws1', name: 'krodak' }
    m.tasks['t1'] = { fetchedAt: 'x', slices: ['user-chris'] }
    m.docs['d1'] = { fetchedAt: 'x', name: 'Handbook', pageCount: 3 }
    m.slices['user-chris'] = {
      kind: 'user',
      scope: '1',
      exportedAt: '2026-08-30T00:00:00Z',
      taskCount: 1,
    }
    m.slices['docs'] = {
      kind: 'docs',
      scope: 'ws1',
      exportedAt: '2026-08-30T00:00:00Z',
      taskCount: 0,
    }
    const md = renderRootReadme(m)
    expect(md).toContain('# ClickUp export: krodak')
    expect(md).toContain('1 task · 1 doc ·')
    expect(md).toContain(
      '| [user-chris](slices/user-chris/README.md) | user | 1 | 1 | 2026-08-30 |',
    )
    expect(md).not.toContain('slices/docs/')
    expect(md).toContain('Docs: [docs/](docs/README.md)')
  })
})
