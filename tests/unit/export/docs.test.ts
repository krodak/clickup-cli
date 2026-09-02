import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { docDirName, exportDocs, pageFileName } from '../../../src/export/docs.js'
import { loadManifest } from '../../../src/export/manifest.js'

const docs = [
  {
    id: 'd1',
    name: 'Team Handbook',
    workspace_id: 1,
    parent: { id: 'sp1', type: 4 },
    date_updated: 1700000000000,
  },
  { id: 'd2', name: '', workspace_id: 1, parent: { id: 'ws1', type: 7 } },
]

const pagesByDoc: Record<string, unknown[]> = {
  d1: [
    {
      id: 'p1',
      doc_id: 'd1',
      name: 'Welcome',
      content: '# Welcome\n\nHello.',
      pages: [
        { id: 'p1a', doc_id: 'd1', name: 'Onboarding / Day 1', content: 'Day one.' },
        { id: 'p1b', doc_id: 'd1', name: 'Archived bit', content: 'old', archived: true },
      ],
    },
    { id: 'p2', doc_id: 'd1', name: 'Welcome', content: 'Duplicate name, different page.' },
  ],
  d2: [{ id: 'p3', doc_id: 'd2', name: null, content: '' }],
}

function makeClient() {
  return {
    getAllDocs: vi.fn().mockResolvedValue(docs),
    getDocPages: vi.fn(async (_ws: string, docId: string) => pagesByDoc[docId] ?? []),
    getTeams: vi.fn().mockResolvedValue([{ id: 'ws1', name: 'krodak' }]),
    getSpaces: vi.fn().mockResolvedValue([{ id: 'sp1', name: 'Kayenta' }]),
  }
}

describe('naming', () => {
  it('docDirName is slug + id, falling back to the id when unnamed', () => {
    expect(docDirName({ id: 'd1', name: 'Team Handbook' })).toBe('team-handbook-d1')
    expect(docDirName({ id: 'd2', name: '' })).toBe('d2')
  })

  it('pageFileName is slug + id .md, safe for nested names', () => {
    expect(pageFileName({ id: 'p1a', name: 'Onboarding / Day 1' })).toBe('onboarding-day-1-p1a.md')
    expect(pageFileName({ id: 'p3', name: null })).toBe('p3.md')
  })
})

describe('exportDocs', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cup-docs-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('writes one dir per doc with doc.json, a README, and nested page files', async () => {
    const client = makeClient()
    const summary = await exportDocs(client as never, 'ws1', {
      root,
      refresh: false,
      log: () => {},
    })

    expect(summary.docs).toBe(2)
    expect(summary.pages).toBe(5)
    expect(summary.failed).toEqual([])

    const d1 = join(root, 'docs', 'team-handbook-d1')
    expect(existsSync(join(d1, 'doc.json'))).toBe(true)
    expect(existsSync(join(d1, 'README.md'))).toBe(true)
    expect(existsSync(join(d1, 'welcome-p1.md'))).toBe(true)
    // children nest in a dir named after the parent page
    expect(existsSync(join(d1, 'welcome-p1', 'onboarding-day-1-p1a.md'))).toBe(true)
    expect(existsSync(join(d1, 'welcome-p1', 'archived-bit-p1b.md'))).toBe(true)
    // same-name sibling does not collide because the id is in the name
    expect(existsSync(join(d1, 'welcome-p2.md'))).toBe(true)
    // unnamed doc + null page name
    expect(existsSync(join(root, 'docs', 'd2', 'p3.md'))).toBe(true)
  })

  it('page files carry a provenance header and the markdown body', async () => {
    await exportDocs(makeClient() as never, 'ws1', { root, refresh: false, log: () => {} })
    const md = readFileSync(join(root, 'docs', 'team-handbook-d1', 'welcome-p1.md'), 'utf8')
    expect(md).toMatch(/^---\n/)
    expect(md).toContain('id: p1')
    expect(md).toContain('doc: d1')
    expect(md).toContain('title: Welcome')
    expect(md).toContain('\n---\n\n# Welcome\n\nHello.')
    const archived = readFileSync(
      join(root, 'docs', 'team-handbook-d1', 'welcome-p1', 'archived-bit-p1b.md'),
      'utf8',
    )
    expect(archived).toContain('archived: true')
  })

  it('doc README lists the page tree with links and shows where the doc lived', async () => {
    await exportDocs(makeClient() as never, 'ws1', { root, refresh: false, log: () => {} })
    const readme = readFileSync(join(root, 'docs', 'team-handbook-d1', 'README.md'), 'utf8')
    expect(readme).toContain('# Team Handbook')
    expect(readme).toContain('Location: space Kayenta')
    expect(readme).toContain('- [Welcome](welcome-p1.md)')
    expect(readme).toContain('    - [Onboarding / Day 1](welcome-p1/onboarding-day-1-p1a.md)')
    expect(readme).toContain('    - [Archived bit](welcome-p1/archived-bit-p1b.md) (archived)')
  })

  it('writes a docs index and records docs in the manifest', async () => {
    await exportDocs(makeClient() as never, 'ws1', { root, refresh: false, log: () => {} })
    const index = readFileSync(join(root, 'docs', 'README.md'), 'utf8')
    expect(index).toContain('[Team Handbook](team-handbook-d1/README.md)')
    expect(index).toContain('[(unnamed d2)](d2/README.md)')
    const m = loadManifest(root)
    expect(m.docs['d1']).toMatchObject({ name: 'Team Handbook', pageCount: 4 })
    expect(m.slices['docs']).toMatchObject({ kind: 'docs', taskCount: 0 })
  })

  it('skips docs already in the manifest unless refresh', async () => {
    const client = makeClient()
    await exportDocs(client as never, 'ws1', { root, refresh: false, log: () => {} })
    client.getDocPages.mockClear()
    const again = await exportDocs(client as never, 'ws1', { root, refresh: false, log: () => {} })
    expect(client.getDocPages).not.toHaveBeenCalled()
    expect(again.skipped).toBe(2)
    await exportDocs(client as never, 'ws1', { root, refresh: true, log: () => {} })
    expect(client.getDocPages).toHaveBeenCalledTimes(2)
  })

  it('records a failing doc and continues', async () => {
    const client = makeClient()
    client.getDocPages.mockImplementation(async (_ws: string, id: string) => {
      if (id === 'd1') throw new Error('boom')
      return pagesByDoc[id] ?? []
    })
    const summary = await exportDocs(client as never, 'ws1', {
      root,
      refresh: false,
      log: () => {},
    })
    expect(summary.failed).toEqual([{ id: 'd1', error: 'boom' }])
    expect(existsSync(join(root, 'docs', 'd2', 'p3.md'))).toBe(true)
  })
})
