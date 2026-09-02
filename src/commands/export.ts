import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'
import {
  discoverListTasks,
  discoverTeamTasks,
  discoverUserTasks,
  resolveUserRef,
} from '../export/discover.js'
import { runExport, type ExportPlan, type RunSummary } from '../export/engine.js'
import { exportDocs as runDocsExport, type DocsExportSummary } from '../export/docs.js'
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
  /** Skip the confirmation prompt (required for `all` when not a TTY). */
  yes?: boolean
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

export interface DocsSummary extends DocsExportSummary {
  slice: 'docs'
  out: string
  dryRun: boolean
}

export async function exportDocs(config: Config, opts: ExportOptions): Promise<DocsSummary> {
  const teamId = requireTeam(config)
  const client = makeClient(config, opts.rpm)
  const root = resolve(opts.out)
  if (opts.dryRun) {
    const docs = await client.getAllDocs(teamId)
    opts.log(`Plan [docs]: ${docs.length} docs`)
    return {
      slice: 'docs',
      out: root,
      dryRun: true,
      docs: docs.length,
      pages: 0,
      skipped: 0,
      failed: [],
    }
  }
  const summary = await runDocsExport(client, teamId, {
    root,
    refresh: opts.refresh,
    log: opts.log,
  })
  writeRootReadme(root, loadManifest(root))
  return { slice: 'docs', out: root, dryRun: false, ...summary }
}

export function formatDocsSummary(s: DocsSummary): string {
  if (s.dryRun) return `Dry run: ${s.docs} docs would be exported to ${s.out}`
  const lines = [
    `Exported docs to ${s.out}/docs`,
    `  docs: ${s.docs} fetched (${s.pages} pages), ${s.skipped} already present, ${s.failed.length} failed`,
  ]
  for (const f of s.failed.slice(0, 10)) lines.push(`  failed ${f.id}: ${f.error}`)
  return lines.join('\n')
}

export interface AllSummary {
  slice: 'all'
  out: string
  dryRun: boolean
  spaces: string[]
  planned: number
  fetched: number
  skipped: number
  failed: Array<{ id: string; error: string }>
  attachmentsDownloaded: number
  attachmentsFailed: number
  docs: DocsExportSummary
}

/** Rough per-task request cost: task + comments + attachments list. */
const REQUESTS_PER_TASK = 3

/**
 * Whole workspace: every space as a team slice, then every doc. Always plans
 * first and requires confirmation (or --yes) because a large workspace is a
 * multi-hour run.
 */
export async function exportAll(config: Config, opts: ExportOptions): Promise<AllSummary> {
  const teamId = requireTeam(config)
  const client = makeClient(config, opts.rpm)
  const root = resolve(opts.out)

  const [spaces, docs, teams] = await Promise.all([
    client.getSpaces(teamId),
    client.getAllDocs(teamId),
    client.getTeams(),
  ])
  const workspaceName = teams.find(t => t.id === teamId)?.name ?? teamId

  // Discovery per space (cheap: list endpoints, 100 tasks per request).
  const plans: ExportPlan[] = []
  for (const space of spaces) plans.push(await discoverTeamTasks(client, teamId, space.id))
  const manifest = loadManifest(root)
  const allTaskIds = new Set(plans.flatMap(p => p.tasks.map(t => t.id)))
  const alreadyExported = [...allTaskIds].filter(id => manifest.tasks[id]).length
  const toFetch = allTaskIds.size - alreadyExported
  const listCount = plans.reduce(
    (n, p) =>
      n +
      (p.hierarchy?.lists.length ?? 0) +
      (p.hierarchy?.folders.reduce((m, f) => m + f.lists.length, 0) ?? 0),
    0,
  )
  const estRequests = toFetch * REQUESTS_PER_TASK + docs.length
  const estMinutes = Math.ceil(estRequests / opts.rpm)

  opts.log(`Workspace export plan for "${workspaceName}":`)
  opts.log(
    `  ${spaces.length} spaces, ${listCount} lists, ${allTaskIds.size} tasks, ${docs.length} docs`,
  )
  opts.log(`  Already exported: ${alreadyExported} tasks (will be skipped)`)
  opts.log(`  Estimated requests: ~${estRequests}`)
  opts.log(
    `  Estimated time at ${opts.rpm} req/min: ~${estMinutes < 60 ? `${estMinutes}m` : `${Math.floor(estMinutes / 60)}h ${estMinutes % 60}m`}`,
  )
  if (opts.attachments) opts.log('  Attachments: downloaded (size unknown until fetched)')

  const empty: AllSummary = {
    slice: 'all',
    out: root,
    dryRun: opts.dryRun,
    spaces: plans.map(p => p.slice.name),
    planned: allTaskIds.size,
    fetched: 0,
    skipped: 0,
    failed: [],
    attachmentsDownloaded: 0,
    attachmentsFailed: 0,
    docs: { docs: docs.length, pages: 0, skipped: 0, failed: [] },
  }
  if (opts.dryRun) return empty

  if (!opts.yes) {
    if (!isTTY()) {
      throw new Error(
        'This is a long-running operation. Re-run with --yes to confirm in non-interactive mode.',
      )
    }
    const { confirm } = await import('@inquirer/prompts')
    const ok = await confirm({
      message: `Export the whole workspace to ${root}?`,
      default: false,
    })
    if (!ok) throw new Error('Cancelled')
  }

  const spaceNames = Object.fromEntries(spaces.map(s => [s.id, s.name]))
  const summary = { ...empty }
  for (const plan of plans) {
    const run = await runExport(client, plan, {
      root,
      refresh: opts.refresh,
      downloadAttachments: opts.attachments,
      concurrency: CONCURRENCY,
      log: opts.log,
      spaceNames,
    })
    summary.fetched += run.fetched
    summary.skipped += run.skipped
    summary.failed.push(...run.failed)
    summary.attachmentsDownloaded += run.attachmentsDownloaded
    summary.attachmentsFailed += run.attachmentsFailed
    const tasks = Object.values(plan.tasksById ?? {})
    writeSliceFiles(
      root,
      plan.slice.name,
      renderTeamIndex(plan.hierarchy!, tasks, {
        exportedAt: new Date().toISOString(),
        initiativeItemId: opts.initiativeItemId,
      }),
      { hierarchy: plan.hierarchy, taskIds: plan.tasks.map(t => t.id) },
    )
  }
  summary.docs = await runDocsExport(client, teamId, { root, refresh: opts.refresh, log: opts.log })
  writeRootReadme(root, loadManifest(root))
  return summary
}

export function formatAllSummary(s: AllSummary): string {
  if (s.dryRun)
    return `Dry run: ${s.planned} tasks across ${s.spaces.length} spaces would be exported to ${s.out}`
  const lines = [
    `Exported workspace to ${s.out}`,
    `  spaces: ${s.spaces.length} (${s.spaces.join(', ')})`,
    `  tasks: ${s.fetched} fetched, ${s.skipped} already present, ${s.failed.length} failed`,
    `  attachments: ${s.attachmentsDownloaded} downloaded, ${s.attachmentsFailed} failed`,
    `  docs: ${s.docs.docs} fetched (${s.docs.pages} pages), ${s.docs.skipped} already present, ${s.docs.failed.length} failed`,
  ]
  for (const f of s.failed.slice(0, 10)) lines.push(`  failed ${f.id}: ${f.error}`)
  if (s.failed.length > 10) lines.push(`  ... and ${s.failed.length - 10} more`)
  return lines.join('\n')
}
