import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ClickUpClient } from '../../src/api.js'
import {
  exportDocs,
  exportInitiatives,
  exportRoadmap,
  exportTeam,
  exportUser,
} from '../../src/commands/export.js'
import { loadManifest } from '../../src/export/manifest.js'
import {
  ensureExportFixture,
  EXPORT_SPACE_NAME,
  INITIATIVE_ITEM_ID,
  type ExportFixture,
} from './fixtures/export-space.js'

const TOKEN = process.env.CLICKUP_API_TOKEN

describe.skipIf(!TOKEN)('Export e2e (personal workspace fixture)', () => {
  let client: ClickUpClient
  let fx: ExportFixture
  let out: string
  const log = () => {}

  beforeAll(async () => {
    client = new ClickUpClient({ apiToken: TOKEN! })
    const teams = await client.getTeams()
    const team = teams.find(t => t.name === 'krodak')
    if (!team) throw new Error('Refusing to run: personal workspace "krodak" not found')
    fx = await ensureExportFixture(client, team.id)
    out = mkdtempSync(join(tmpdir(), 'cup-export-e2e-'))
  }, 120_000)

  afterAll(() => {
    if (out) rmSync(out, { recursive: true, force: true })
  })

  const opts = (over: Partial<Parameters<typeof exportTeam>[2]> = {}) => ({
    out,
    refresh: false,
    attachments: true,
    dryRun: false,
    rpm: 90,
    log,
    initiativeItemId: INITIATIVE_ITEM_ID,
    ...over,
  })

  it('team: exports every task in the space incl. archived, nested subtasks and an attachment', async () => {
    const config = { apiToken: TOKEN!, teamId: fx.teamId }
    const summary = await exportTeam(config, EXPORT_SPACE_NAME, opts())

    expect(summary.failed).toEqual([])
    expect(summary.fetched).toBe(7)
    for (const id of [
      fx.initiativeId,
      fx.subtaskAId,
      fx.subtaskBId,
      fx.nestedId,
      fx.standaloneId,
      fx.archivedId,
      fx.sprintTaskId,
    ]) {
      expect(existsSync(join(out, 'tasks', id, 'task.json')), id).toBe(true)
      expect(existsSync(join(out, 'tasks', id, 'task.md')), id).toBe(true)
    }

    expect(readFileSync(join(out, 'tasks', fx.archivedId, 'task.md'), 'utf8')).toContain(
      '**Archived:** yes',
    )
    // depth-2 subtask linked relatively from its parent
    expect(readFileSync(join(out, 'tasks', fx.subtaskBId, 'task.md'), 'utf8')).toContain(
      `(../${fx.nestedId}/task.md)`,
    )
    // attachment downloaded and linked locally
    const standalone = readFileSync(join(out, 'tasks', fx.standaloneId, 'task.md'), 'utf8')
    expect(standalone).toMatch(/\]\(attachments\/[^)]+fixture\.txt\)/)
    expect(summary.attachmentsDownloaded).toBe(1)
    // threaded reply rendered under its parent
    const comments = readFileSync(join(out, 'tasks', fx.standaloneId, 'comments.md'), 'utf8')
    expect(comments).toContain('First comment')
    expect(comments).toContain('> Reply to first')

    const index = readFileSync(join(out, 'slices', 'team-e2e-export', 'README.md'), 'utf8')
    expect(index).toContain('## Export Roadmap — 3 tasks')
    expect(index).toContain('## Folder: Sprints')
    expect(index).toContain('### Sprint 1 — 1 tasks')
    expect(index).toContain('| initiative |')
  }, 180_000)

  it('roadmap: reuses the cached tasks and groups the initiative with its subtask tree', async () => {
    const config = { apiToken: TOKEN!, teamId: fx.teamId }
    const summary = await exportRoadmap(config, fx.roadmapListId, opts())

    expect(summary.failed).toEqual([])
    expect(summary.fetched).toBe(0)
    expect(summary.skipped).toBe(6)

    const index = readFileSync(join(out, 'slices', 'roadmap-export-roadmap', 'README.md'), 'utf8')
    expect(index).toContain(`### [Export initiative](../../tasks/${fx.initiativeId}/task.md)`)
    expect(index).toContain(`- [x] [Initiative subtask B](../../tasks/${fx.subtaskBId}/task.md)`)
    expect(index).toContain(`    - [ ] [Nested subtask B.1](../../tasks/${fx.nestedId}/task.md)`)
    expect(index).toContain('## Ungrouped tasks (2)')
  }, 120_000)

  it('initiatives: only the initiative and its tree', async () => {
    const config = { apiToken: TOKEN!, teamId: fx.teamId }
    const summary = await exportInitiatives(config, fx.roadmapListId, opts())

    expect(summary.failed).toEqual([])
    expect(summary.planned).toBe(1)
    const index = readFileSync(
      join(out, 'slices', 'initiatives-export-roadmap', 'README.md'),
      'utf8',
    )
    expect(index).toContain('## Ungrouped tasks (0)')
    expect(index).toContain(`(../../tasks/${fx.nestedId}/task.md)`)
  }, 120_000)

  it('user: composes into the same archive and the manifest records every slice', async () => {
    const config = { apiToken: TOKEN!, teamId: fx.teamId }
    const summary = await exportUser(config, 'me', opts({ attachments: false }))
    expect(summary.failed).toEqual([])

    const m = loadManifest(out)
    expect(Object.keys(m.slices).sort()).toEqual([
      'initiatives-export-roadmap',
      'roadmap-export-roadmap',
      'team-e2e-export',
      expect.stringMatching(/^user-/),
    ])
    const root = readFileSync(join(out, 'README.md'), 'utf8')
    expect(root).toContain('[team-e2e-export](slices/team-e2e-export/README.md)')
    expect(root).toContain('[roadmap-export-roadmap](slices/roadmap-export-roadmap/README.md)')
  }, 300_000)

  it('docs: exports every workspace doc as page trees and links from the root README', async () => {
    const config = { apiToken: TOKEN!, teamId: fx.teamId }
    const summary = await exportDocs(config, opts())
    expect(summary.failed).toEqual([])
    expect(summary.docs).toBeGreaterThan(0)
    expect(existsSync(join(out, 'docs', 'README.md'))).toBe(true)
    const root = readFileSync(join(out, 'README.md'), 'utf8')
    expect(root).toContain('Docs: [docs/](docs/README.md)')
    expect(root).not.toContain('slices/docs/')
  }, 300_000)
})
