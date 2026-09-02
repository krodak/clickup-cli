import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const MANIFEST_VERSION = 1

export type SliceKind = 'user' | 'team' | 'roadmap' | 'initiatives' | 'docs' | 'space'

export interface ManifestTaskEntry {
  fetchedAt: string
  /** Slice names that included this task. */
  slices: string[]
  /** sha256 of task.json, for change detection on --refresh. */
  contentHash?: string
}

export interface ManifestDocEntry {
  fetchedAt: string
  name: string
  pageCount: number
}

export interface ManifestSliceEntry {
  kind: SliceKind
  /** Human-readable scope identifier (user id, space id, list id...). */
  scope: string
  exportedAt: string
  taskCount: number
}

export interface Manifest {
  version: number
  workspace: { id: string; name: string } | undefined
  tasks: Record<string, ManifestTaskEntry>
  docs: Record<string, ManifestDocEntry>
  slices: Record<string, ManifestSliceEntry>
}

const FILE = 'manifest.json'

export function emptyManifest(): Manifest {
  return { version: MANIFEST_VERSION, workspace: undefined, tasks: {}, docs: {}, slices: {} }
}

export function loadManifest(root: string): Manifest {
  const path = join(root, FILE)
  if (!existsSync(path)) return emptyManifest()
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new Error(`Cannot parse ${path}: ${(err as Error).message}`, { cause: err })
  }
  const m = parsed as Partial<Manifest>
  if (m.version !== MANIFEST_VERSION) {
    throw new Error(
      `Unsupported manifest version ${String(m.version)} in ${path} (expected ${MANIFEST_VERSION})`,
    )
  }
  return {
    version: MANIFEST_VERSION,
    workspace: m.workspace ?? undefined,
    tasks: m.tasks ?? {},
    docs: m.docs ?? {},
    slices: m.slices ?? {},
  }
}

/** Write via temp file + rename so a crash never leaves a truncated manifest. */
export function saveManifest(root: string, manifest: Manifest): void {
  mkdirSync(root, { recursive: true })
  const path = join(root, FILE)
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n')
  renameSync(tmp, path)
}
