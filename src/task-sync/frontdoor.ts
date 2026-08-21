import type { Config } from '../config.js'
import { describeSessionToken, resolveSessionToken, SESSION_TOKEN_HELP } from '../session-token.js'
import type { CompiledSyncBlock } from '../cufm/compile.js'
import type { SyncedContentBlock } from '../cufm/decompile.js'
import type { DeltaOp } from '../rich-text/delta.js'

const DEFAULT_HOST = 'frontdoor-prod-us-east-2-2.clickup.com'

export async function fetchTaskOps(
  config: Config,
  taskId: string,
  sessionToken?: string,
): Promise<{ ops: DeltaOp[]; syncBlocks: SyncedContentBlock[] } | undefined> {
  const resolved = resolveSessionToken(config, sessionToken)
  if (!resolved) return undefined
  if (resolved.expired) return fail(describeSessionToken(resolved))
  const token = resolved.token
  const host = process.env.CU_FRONTDOOR_HOST ?? DEFAULT_HOST
  const url =
    `https://${host}/task-v3/experience/${config.teamId}/tasks/${taskId}` +
    `?fields%5B%5D=core&fields%5B%5D=sync_blocks&filterOmit=task(lower_text_content)`
  try {
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        origin: 'https://app.clickup.com',
        'x-csrf': '1',
        'x-workspace-id': config.teamId,
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return fail(`HTTP ${res.status}`)
    const json = (await res.json()) as {
      task?: { content?: string }
      sync_blocks?: Array<{ id?: string; content?: string }>
    }
    const raw = json.task?.content
    if (!raw) return fail('response had no task content')
    const parsed = JSON.parse(raw) as { ops?: DeltaOp[] }
    if (!Array.isArray(parsed.ops)) return fail('task content is not a Quill delta')
    return { ops: parsed.ops, syncBlocks: parseSyncBlocks(json.sync_blocks) }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

export async function updateSyncBlockContents(
  config: Config,
  blocks: readonly CompiledSyncBlock[],
  sessionToken?: string,
): Promise<void> {
  if (blocks.length === 0) return
  const resolved = resolveSessionToken(config, sessionToken)
  if (!resolved) {
    throw new Error(
      `Updating Synced Content requires a ClickUp session token (cup auth session, CU_SESSION_TOKEN, or --session-token).\n${SESSION_TOKEN_HELP}`,
    )
  }
  if (resolved.expired) {
    throw new Error(
      `Updating Synced Content requires a valid session token (${describeSessionToken(resolved)}).\nRefresh it with: cup auth session`,
    )
  }
  const token = resolved.token
  const host = process.env.CU_FRONTDOOR_HOST ?? DEFAULT_HOST
  for (const block of blocks) {
    const res = await fetch(
      `https://${host}/docs-service-v3/core/workspaces/${config.teamId}/syncBlocks/${block.id}`,
      {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          origin: 'https://app.clickup.com',
          'x-csrf': '1',
          'x-workspace-id': config.teamId,
        },
        body: JSON.stringify({ content: JSON.stringify({ ops: block.ops }) }),
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!res.ok) {
      throw new Error(`ClickUp Synced Content update failed for ${block.id}: HTTP ${res.status}`)
    }
  }
}

function parseSyncBlocks(
  blocks: Array<{ id?: string; content?: string }> | undefined,
): SyncedContentBlock[] {
  const out: SyncedContentBlock[] = []
  for (const block of blocks ?? []) {
    if (!block.id || !block.content) continue
    try {
      const parsed = JSON.parse(block.content) as { ops?: DeltaOp[] }
      if (Array.isArray(parsed.ops)) out.push({ id: block.id, ops: parsed.ops })
    } catch {
      continue
    }
  }
  return out
}

// A token was supplied, so the user expects a lossless pull; say why it degraded
// rather than silently falling back to markdown_description.
function fail(reason: string): undefined {
  console.error(`warning: lossless pull failed (${reason}); falling back to markdown export`)
  return undefined
}
