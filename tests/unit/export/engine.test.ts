import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runExport, type DiscoveredTask, type ExportPlan } from '../../../src/export/engine.js'
import { loadManifest, saveManifest } from '../../../src/export/manifest.js'

function task(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    name: `Task ${id}`,
    status: { status: 'open', color: '#000' },
    assignees: [],
    url: `https://app.clickup.com/t/${id}`,
    list: { id: 'l1', name: 'L' },
    ...extra,
  }
}

function makeClient(tasks: Record<string, ReturnType<typeof task>>) {
  return {
    getTaskForExport: vi.fn(async (id: string) => {
      const t = tasks[id]
      if (!t) throw new Error(`no such task ${id}`)
      return t
    }),
    getAllTaskComments: vi.fn().mockResolvedValue([]),
    getThreadedComments: vi.fn().mockResolvedValue([]),
  }
}

const plan = (ids: string[]): ExportPlan => ({
  slice: { name: 'user-me', kind: 'user', scope: 'me' },
  tasks: ids.map<DiscoveredTask>(id => ({ id, listId: 'l1' })),
  workspace: { id: 'ws1', name: 'krodak' },
})

describe('runExport', () => {
  let root: string
  const stderr: string[] = []

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cup-engine-'))
    stderr.length = 0
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const baseOpts = () => ({
    root,
    refresh: false,
    downloadAttachments: false,
    concurrency: 2,
    log: (s: string) => stderr.push(s),
  })

  it('fetches every planned task, writes bundles, and records them in the manifest', async () => {
    const client = makeClient({ t1: task('t1'), t2: task('t2') })
    const summary = await runExport(client, plan(['t1', 't2']), baseOpts())

    expect(summary.fetched).toBe(2)
    expect(summary.skipped).toBe(0)
    expect(existsSync(join(root, 'tasks', 't1', 'task.md'))).toBe(true)
    expect(existsSync(join(root, 'tasks', 't2', 'task.md'))).toBe(true)

    const m = loadManifest(root)
    expect(Object.keys(m.tasks).sort()).toEqual(['t1', 't2'])
    expect(m.tasks['t1']!.slices).toEqual(['user-me'])
    expect(m.slices['user-me']).toMatchObject({ kind: 'user', scope: 'me', taskCount: 2 })
    expect(m.workspace).toEqual({ id: 'ws1', name: 'krodak' })
  })

  it('skips tasks already in the manifest unless refresh is set, but still records slice membership', async () => {
    // A previous slice exported t1.
    const first = makeClient({ t1: task('t1') })
    await runExport(
      first,
      { ...plan(['t1']), slice: { name: 'team-x', kind: 'team', scope: 'x' } },
      baseOpts(),
    )

    const client = makeClient({ t1: task('t1'), t2: task('t2') })
    const summary = await runExport(client, plan(['t1', 't2']), baseOpts())

    expect(summary.skipped).toBe(1)
    expect(summary.fetched).toBe(1)
    expect(client.getTaskForExport).not.toHaveBeenCalledWith('t1')
    expect(loadManifest(root).tasks['t1']!.slices.sort()).toEqual(['team-x', 'user-me'])
  })

  it('re-fetches everything with refresh', async () => {
    const m = loadManifest(root)
    m.tasks['t1'] = { fetchedAt: '2026-01-01T00:00:00.000Z', slices: ['user-me'] }
    saveManifest(root, m)
    const client = makeClient({ t1: task('t1') })
    const summary = await runExport(client, plan(['t1']), { ...baseOpts(), refresh: true })
    expect(summary.fetched).toBe(1)
    expect(client.getTaskForExport).toHaveBeenCalledWith('t1')
  })

  it('follows subtasks discovered on fetched tasks even when the plan did not list them', async () => {
    const client = makeClient({
      t1: task('t1', { subtasks: [{ id: 's1', name: 'Sub' }] }),
      s1: task('s1', { parent: 't1', subtasks: [{ id: 's2', name: 'Deep' }] }),
      s2: task('s2', { parent: 's1' }),
    })
    const summary = await runExport(client, plan(['t1']), baseOpts())
    expect(summary.fetched).toBe(3)
    expect(existsSync(join(root, 'tasks', 's2', 'task.md'))).toBe(true)
    // parent's task.md links to the exported subtask relatively
    expect(readFileSync(join(root, 'tasks', 't1', 'task.md'), 'utf8')).toContain('(../s1/task.md)')
  })

  it('records per-task failures and continues instead of aborting the run', async () => {
    const client = makeClient({ t1: task('t1'), t3: task('t3') })
    const summary = await runExport(client, plan(['t1', 't2', 't3']), baseOpts())
    expect(summary.fetched).toBe(2)
    expect(summary.failed).toEqual([{ id: 't2', error: 'no such task t2' }])
    expect(loadManifest(root).tasks['t2']).toBeUndefined()
    expect(existsSync(join(root, 'tasks', 't3', 'task.md'))).toBe(true)
  })

  it('reports progress to the log', async () => {
    const client = makeClient({ t1: task('t1'), t2: task('t2') })
    await runExport(client, plan(['t1', 't2']), baseOpts())
    expect(stderr.some(l => /2\/2/.test(l))).toBe(true)
  })
})

describe('runExport resilience', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cup-engine-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('re-fetches a task whose manifest entry exists but whose files are missing', async () => {
    const m = loadManifest(root)
    m.tasks['t1'] = { fetchedAt: '2026-01-01T00:00:00.000Z', slices: ['old'] }
    saveManifest(root, m)
    const client = makeClient({ t1: task('t1') })
    const summary = await runExport(client, plan(['t1']), {
      root,
      refresh: false,
      downloadAttachments: false,
      concurrency: 2,
      log: () => {},
    })
    expect(summary.fetched).toBe(1)
    expect(summary.skipped).toBe(0)
    expect(existsSync(join(root, 'tasks', 't1', 'task.json'))).toBe(true)
  })
})

describe('runExport attachment backfill', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cup-engine-bf-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('downloads missing attachments for cached tasks when attachments are enabled', async () => {
    const download = vi.fn(async (url: string) => Buffer.from(`file:${url}`))
    const client = makeClient({
      t1: task('t1', {
        attachments: [
          {
            id: 'a1',
            version: '1',
            date: 1,
            title: 'x.png',
            extension: 'png',
            url: 'https://cdn/a1',
          },
        ],
      }),
    })
    const base = { root, refresh: false, concurrency: 2, log: () => {}, download }

    const first = await runExport(client, plan(['t1']), {
      ...base,
      downloadAttachments: false,
    })
    expect(first.attachmentsDownloaded).toBe(0)
    expect(existsSync(join(root, 'tasks', 't1', 'attachments', 'a1-x.png'))).toBe(false)

    const second = await runExport(client, plan(['t1']), {
      ...base,
      downloadAttachments: true,
    })
    expect(second.skipped).toBe(1)
    expect(second.fetched).toBe(0)
    expect(second.attachmentsDownloaded).toBe(1)
    expect(existsSync(join(root, 'tasks', 't1', 'attachments', 'a1-x.png'))).toBe(true)
    // re-rendered markdown now links locally
    expect(readFileSync(join(root, 'tasks', 't1', 'task.md'), 'utf8')).toContain(
      '(attachments/a1-x.png)',
    )
  })
})
