import type { Config } from '../config.js'
import { describeSessionToken, resolveSessionToken, SESSION_TOKEN_HELP } from '../session-token.js'
import type { CompiledSyncBlock } from '../cufm/compile.js'
import type { SyncedContentBlock } from '../cufm/decompile.js'
import type { DeltaOp } from '../rich-text/delta.js'
import { isRecord } from '../util/guards.js'

const HANDSHAKE_URL = 'https://id.app.clickup.com/shard/v1/handshake'
const SHARD_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const hostCache = new Map<string, Promise<string>>()

/** Test hook: drop the in-process handshake cache. */
export function clearFrontdoorHostCache(): void {
  hostCache.clear()
}

/**
 * The web app does not hardcode a regional frontdoor host. It asks
 * `id.app.clickup.com/shard/v1/handshake/{workspaceId}` (no auth) and uses
 * `appEnvironment.apiUrlBase`. `CU_FRONTDOOR_HOST` still wins when set.
 */
export async function resolveFrontdoorHost(teamId: string): Promise<string> {
  const override = process.env.CU_FRONTDOOR_HOST?.trim()
  if (override) return override
  const cached = hostCache.get(teamId)
  if (cached) return cached
  const pending = handshakeHost(teamId)
  hostCache.set(teamId, pending)
  try {
    return await pending
  } catch (error) {
    hostCache.delete(teamId)
    throw error
  }
}

async function handshakeHost(teamId: string): Promise<string> {
  const res = await fetch(`${HANDSHAKE_URL}/${encodeURIComponent(teamId)}`, {
    headers: {
      accept: 'application/json',
      origin: 'https://app.clickup.com',
      'x-csrf': '1',
      'x-workspace-id': teamId,
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    throw new Error(`workspace handshake failed: HTTP ${res.status}`)
  }
  const json: unknown = await res.json()
  const host = hostFromHandshake(json)
  if (!host) throw new Error('workspace handshake did not include a ClickUp editor host')
  return host
}

function hostFromHandshake(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined
  const env = json.appEnvironment
  if (isRecord(env) && typeof env.apiUrlBase === 'string') {
    const host = httpsClickupHost(env.apiUrlBase)
    if (host) return host
  }
  if (typeof json.shardId === 'string' && SHARD_ID_RE.test(json.shardId)) {
    return `frontdoor-${json.shardId}.clickup.com`
  }
  return undefined
}

function httpsClickupHost(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return undefined
    if (!parsed.hostname.endsWith('.clickup.com')) return undefined
    return parsed.hostname
  } catch {
    return undefined
  }
}

export async function fetchTaskOps(
  config: Config,
  taskId: string,
  sessionToken?: string,
): Promise<{ ops: DeltaOp[]; syncBlocks: SyncedContentBlock[] } | undefined> {
  const resolved = resolveSessionToken(config, sessionToken)
  if (!resolved) return undefined
  if (resolved.expired) return fail(describeSessionToken(resolved))
  const token = resolved.token
  let host: string
  try {
    host = await resolveFrontdoorHost(config.teamId)
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
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
  const host = await resolveFrontdoorHost(config.teamId)
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
