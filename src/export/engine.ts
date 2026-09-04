import type { ClickUpClient, Task } from '../api.js'
import { runInBatches } from '../util/batch.js'
import { fetchTaskBundle } from './bundle.js'
import { loadManifest, saveManifest, type Manifest, type SliceKind } from './manifest.js'
import {
  backfillAttachments,
  readBundleData,
  renderBundleMarkdown,
  writeBundleData,
  type Downloader,
} from './writer.js'
import { plural } from '../util/plural.js'

export interface DiscoveredTask {
  id: string
  listId?: string
  /** True when the task carries an initiative custom item type. */
  initiative?: boolean
}

export interface SliceSpec {
  /** Directory-safe name, e.g. `user-chris`, `team-kayenta`. */
  name: string
  kind: SliceKind
  scope: string
}

export interface SpaceHierarchy {
  space: { id: string; name: string }
  folders: Array<{ id: string; name: string; lists: Array<{ id: string; name: string }> }>
  /** Folderless lists. */
  lists: Array<{ id: string; name: string }>
}

export interface ExportPlan {
  slice: SliceSpec
  tasks: DiscoveredTask[]
  workspace: { id: string; name: string }
  /** Full task objects from discovery, when the list endpoint returned them. */
  tasksById?: Record<string, Task>
  /** Set by team discovery: the space's folder/list structure. */
  hierarchy?: SpaceHierarchy
  /** Set by list discovery (roadmap / initiatives). */
  list?: { id: string; name: string }
}

export interface RunOptions {
  root: string
  refresh: boolean
  downloadAttachments: boolean
  concurrency: number
  log: (line: string) => void
  download?: Downloader
  /** Save the manifest every N fetched tasks (crash resume granularity). */
  checkpointEvery?: number
  /** Space id -> display name, for rendering. */
  spaceNames?: Record<string, string>
}

export interface RunSummary {
  fetched: number
  skipped: number
  failed: Array<{ id: string; error: string }>
  attachmentsDownloaded: number
  attachmentsFailed: number
}

type EngineClient = Pick<
  ClickUpClient,
  'getTaskForExport' | 'getAllTaskComments' | 'getThreadedComments'
>

function addSlice(manifest: Manifest, taskId: string, slice: string): void {
  const entry = manifest.tasks[taskId]
  if (entry && !entry.slices.includes(slice)) entry.slices.push(slice)
}

/**
 * Phase two of an export: fetch every planned task (and any subtask found on
 * the way) that is not already in the manifest, write its bundle, then render
 * markdown for the whole archive so cross-links reflect what is present.
 */
export async function runExport(
  client: EngineClient,
  plan: ExportPlan,
  opts: RunOptions,
): Promise<RunSummary> {
  const manifest = loadManifest(opts.root)
  manifest.workspace = plan.workspace
  const sliceName = plan.slice.name
  const checkpointEvery = opts.checkpointEvery ?? 25

  const queue: string[] = []
  const queued = new Set<string>()
  const enqueue = (id: string) => {
    if (!queued.has(id)) {
      queued.add(id)
      queue.push(id)
    }
  }
  for (const t of plan.tasks) enqueue(t.id)

  const summary: RunSummary = {
    fetched: 0,
    skipped: 0,
    failed: [],
    attachmentsDownloaded: 0,
    attachmentsFailed: 0,
  }
  const touched = new Set<string>()
  let sinceCheckpoint = 0

  while (queue.length > 0) {
    const batch = queue.splice(0, opts.concurrency)
    const toFetch: string[] = []
    for (const id of batch) {
      touched.add(id)
      if (!opts.refresh && manifest.tasks[id]) {
        summary.skipped++
        addSlice(manifest, id, sliceName)
        // Still walk its subtasks so a partially exported tree completes, and
        // fetch any attachments an earlier --no-attachments run left behind.
        try {
          const cached = await readBundleData(opts.root, id)
          for (const s of cached.subtaskIds) enqueue(s)
          if (opts.downloadAttachments && cached.attachments.length > 0) {
            const bf = await backfillAttachments(opts.root, id, opts.download)
            summary.attachmentsDownloaded += bf.downloaded
            summary.attachmentsFailed += bf.failed.length
          }
        } catch {
          // bundle data missing on disk: treat as not exported
          delete manifest.tasks[id]
          toFetch.push(id)
          summary.skipped--
        }
        continue
      }
      toFetch.push(id)
    }

    const outcomes = await runInBatches(toFetch, opts.concurrency, async id => {
      const bundle = await fetchTaskBundle(client, id)
      const written = await writeBundleData(opts.root, bundle, {
        downloadAttachments: opts.downloadAttachments,
        download: opts.download,
      })
      return { bundle, written }
    })

    for (const o of outcomes) {
      if (!o.ok) {
        summary.failed.push({ id: o.item, error: o.error.message })
        continue
      }
      const { bundle, written } = o.result
      summary.fetched++
      summary.attachmentsDownloaded += written.attachmentsDownloaded
      summary.attachmentsFailed += written.attachmentsFailed.length
      const existing = manifest.tasks[bundle.task.id]
      manifest.tasks[bundle.task.id] = {
        fetchedAt: bundle.fetchedAt,
        slices: existing?.slices.includes(sliceName)
          ? existing.slices
          : [...(existing?.slices ?? []), sliceName],
        contentHash: written.contentHash,
      }
      for (const s of bundle.subtaskIds) enqueue(s)
      sinceCheckpoint++
    }

    const total = touched.size + queue.length
    const done = summary.fetched + summary.skipped + summary.failed.length
    opts.log(
      `[${sliceName}] ${done}/${plural(total, 'task')} (${summary.fetched} fetched, ${summary.skipped} cached, ${summary.failed.length} failed)`,
    )

    if (sinceCheckpoint >= checkpointEvery) {
      saveManifest(opts.root, manifest)
      sinceCheckpoint = 0
    }
  }

  // Render markdown for every task in the archive so links resolve against the
  // final membership, including tasks exported by earlier slices.
  const known = new Set(Object.keys(manifest.tasks))
  const hasTask = (id: string) => known.has(id)
  const spaceNames = opts.spaceNames
  const spaceName = spaceNames ? (id: string) => spaceNames[id] : undefined
  const renderOutcomes = await runInBatches([...known], opts.concurrency * 2, async id => {
    const bundle = await readBundleData(opts.root, id)
    await renderBundleMarkdown(opts.root, bundle, hasTask, spaceName)
  })
  for (const o of renderOutcomes) {
    if (!o.ok) opts.log(`warning: could not render ${o.item}: ${o.error.message}`)
  }

  manifest.slices[sliceName] = {
    kind: plan.slice.kind,
    scope: plan.slice.scope,
    exportedAt: new Date().toISOString(),
    taskCount: [...touched].filter(id => manifest.tasks[id]).length,
  }
  saveManifest(opts.root, manifest)
  return summary
}
