import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { discoverUserTasks, resolveUserRef } from '../export/discover.js'
import { runExport, type ExportPlan, type RunSummary } from '../export/engine.js'
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
