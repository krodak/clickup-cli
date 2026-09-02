import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import {
  discoverListTasks,
  discoverTeamTasks,
  discoverUserTasks,
  resolveUserRef,
} from '../export/discover.js'
import { runExport, type ExportPlan, type RunSummary } from '../export/engine.js'
import { renderRoadmapIndex, renderTeamIndex } from '../export/index-team.js'
import { renderUserIndex } from '../export/index-user.js'
import { loadManifest } from '../export/manifest.js'
import { writeRootReadme } from '../export/root-readme.js'
import { createRateLimiter } from '../util/rate-limit.js'

export interface ExportOptions {
  out: string
  refresh: boolean
  attachments: boolean
  dryRun: boolean
  rpm: number
  log: (line: string) => void
  /** custom_item_id marking an initiative; team convention, not discoverable. */
  initiativeItemId?: number
}

export interface ExportSummary extends RunSummary {
  slice: string
  planned: number
  out: string
  dryRun: boolean
}

const CONCURRENCY = 4

function requireTeam(config: Config): string {
  if (!config.teamId) {
    throw new Error('Export requires a teamId in your config. Run `cup init` to set one.')
  }
  return config.teamId
}

function makeClient(config: Config, rpm: number): ClickUpClient {
  return new ClickUpClient({ ...config, rateLimiter: createRateLimiter(rpm) })
}

function emptySummary(plan: ExportPlan, opts: ExportOptions): ExportSummary {
  return {
    slice: plan.slice.name,
    planned: plan.tasks.length,
    out: resolve(opts.out),
    dryRun: opts.dryRun,
    fetched: 0,
    skipped: 0,
    failed: [],
    attachmentsDownloaded: 0,
    attachmentsFailed: 0,
  }
}

function describePlan(plan: ExportPlan): string {
  const initiatives = plan.tasks.filter(t => t.initiative).length
  return `Plan [${plan.slice.name}]: ${plan.tasks.length} tasks (${initiatives} initiatives) in workspace "${plan.workspace.name}"`
}

async function execute(
  client: ClickUpClient,
  teamId: string,
  plan: ExportPlan,
  opts: ExportOptions,
  writeIndex: (root: string, spaceNames: Record<string, string>) => Promise<void>,
): Promise<ExportSummary> {
  opts.log(describePlan(plan))
  const summary = emptySummary(plan, opts)
  if (opts.dryRun) return summary

  const root = resolve(opts.out)
  const spaces = await client.getSpaces(teamId)
  const spaceNames = Object.fromEntries(spaces.map(s => [s.id, s.name]))
  const run = await runExport(client, plan, {
    root,
    refresh: opts.refresh,
    downloadAttachments: opts.attachments,
    concurrency: CONCURRENCY,
    log: opts.log,
    spaceNames,
  })
  await writeIndex(root, spaceNames)
  writeRootReadme(root, loadManifest(root))
  return { ...summary, ...run }
}

export async function exportUser(
  config: Config,
  userRef: string,
  opts: ExportOptions,
): Promise<ExportSummary> {
  const teamId = requireTeam(config)
  const client = makeClient(config, opts.rpm)
  const user = await resolveUserRef(client, teamId, userRef)
  const plan = await discoverUserTasks(client, teamId, userRef)

  return execute(client, teamId, plan, opts, async (root, spaceNames) => {
    const tasks = Object.values(plan.tasksById ?? {})
    const dir = join(root, 'slices', plan.slice.name)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'README.md'),
      renderUserIndex(user, tasks, { exportedAt: new Date().toISOString(), spaceNames }),
    )
    writeFileSync(
      join(dir, 'tasks.json'),
      JSON.stringify({ user, taskIds: plan.tasks.map(t => t.id) }, null, 2) + '\n',
    )
  })
}

export function formatExportSummary(s: ExportSummary): string {
  if (s.dryRun) return `Dry run: ${s.planned} tasks would be exported to ${s.out}`
  const lines = [
    `Exported slice "${s.slice}" to ${s.out}`,
    `  tasks: ${s.fetched} fetched, ${s.skipped} already present, ${s.failed.length} failed`,
    `  attachments: ${s.attachmentsDownloaded} downloaded, ${s.attachmentsFailed} failed`,
  ]
  for (const f of s.failed.slice(0, 10)) lines.push(`  failed ${f.id}: ${f.error}`)
  if (s.failed.length > 10) lines.push(`  ... and ${s.failed.length - 10} more`)
  return lines.join('\n')
}

function writeSliceFiles(root: string, sliceName: string, readme: string, meta: unknown): void {
  const dir = join(root, 'slices', sliceName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'README.md'), readme)
  writeFileSync(join(dir, 'tasks.json'), JSON.stringify(meta, null, 2) + '\n')
}

export async function exportTeam(
  config: Config,
  spaceRef: string,
  opts: ExportOptions,
): Promise<ExportSummary> {
  const teamId = requireTeam(config)
  const client = makeClient(config, opts.rpm)
  const plan = await discoverTeamTasks(client, teamId, spaceRef)

  return execute(client, teamId, plan, opts, async root => {
    const manifest = loadManifest(root)
    const relatedSlices = Object.entries(manifest.slices)
      .filter(([, s]) => s.kind === 'roadmap' || s.kind === 'initiatives')
      .map(([name, s]) => ({ name, listId: s.scope }))
    const tasks = Object.values(plan.tasksById ?? {})
    writeSliceFiles(
      root,
      plan.slice.name,
      renderTeamIndex(plan.hierarchy!, tasks, {
        exportedAt: new Date().toISOString(),
        relatedSlices,
        initiativeItemId: opts.initiativeItemId,
      }),
      { hierarchy: plan.hierarchy, taskIds: plan.tasks.map(t => t.id) },
    )
  })
}

export async function exportRoadmap(
  config: Config,
  listId: string,
  opts: ExportOptions,
): Promise<ExportSummary> {
  const teamId = requireTeam(config)
  const client = makeClient(config, opts.rpm)
  const plan = await discoverListTasks(client, teamId, listId, { kind: 'roadmap' })

  return execute(client, teamId, plan, opts, async root => {
    const tasks = Object.values(plan.tasksById ?? {})
    writeSliceFiles(
      root,
      plan.slice.name,
      renderRoadmapIndex(plan.list!, tasks, {
        exportedAt: new Date().toISOString(),
        initiativeItemId: opts.initiativeItemId,
      }),
      {
        list: plan.list,
        initiativeItemId: opts.initiativeItemId ?? null,
        taskIds: plan.tasks.map(t => t.id),
      },
    )
  })
}

export async function exportInitiatives(
  config: Config,
  listId: string,
  opts: ExportOptions,
): Promise<ExportSummary> {
  const teamId = requireTeam(config)
  if (opts.initiativeItemId === undefined) {
    throw new Error(
      'initiatives export needs --item-id <n>: the custom_item_id your workspace uses for initiatives (see `cup task-types`)',
    )
  }
  const client = makeClient(config, opts.rpm)
  const plan = await discoverListTasks(client, teamId, listId, {
    kind: 'initiatives',
    initiativeItemId: opts.initiativeItemId,
  })

  return execute(client, teamId, plan, opts, async root => {
    // The roadmap renderer needs the subtask trees, which the engine fetched;
    // reload them from the archive rather than re-querying the API.
    const { readBundleData } = await import('../export/writer.js')
    const manifest = loadManifest(root)
    const wanted = new Set<string>()
    const queue = plan.tasks.map(t => t.id)
    while (queue.length > 0) {
      const id = queue.pop()!
      if (wanted.has(id) || !manifest.tasks[id]) continue
      wanted.add(id)
      const b = await readBundleData(root, id)
      queue.push(...b.subtaskIds)
    }
    const tasks = await Promise.all(
      [...wanted].map(id => readBundleData(root, id).then(b => b.task)),
    )
    writeSliceFiles(
      root,
      plan.slice.name,
      renderRoadmapIndex(plan.list!, tasks, {
        exportedAt: new Date().toISOString(),
        initiativeItemId: opts.initiativeItemId,
      }),
      {
        list: plan.list,
        initiativeItemId: opts.initiativeItemId,
        taskIds: plan.tasks.map(t => t.id),
      },
    )
  })
}
