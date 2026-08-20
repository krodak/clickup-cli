import type { Config } from '../config.js'
import type { DeltaOp } from '../rich-text/delta.js'

const DEFAULT_HOST = 'frontdoor-prod-us-east-2-2.clickup.com'

export async function fetchTaskOps(
  config: Config,
  taskId: string,
  sessionToken?: string,
): Promise<{ ops: DeltaOp[] } | undefined> {
  const token = sessionToken ?? process.env.CU_SESSION_TOKEN
  if (!token) return undefined
  const host = process.env.CU_FRONTDOOR_HOST ?? DEFAULT_HOST
  const url =
    `https://${host}/task-v3/experience/${config.teamId}/tasks/${taskId}` +
    `?fields%5B%5D=core&filterOmit=task(lower_text_content)`
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
    const json = (await res.json()) as { task?: { content?: string } }
    const raw = json.task?.content
    if (!raw) return fail('response had no task content')
    const parsed = JSON.parse(raw) as { ops?: DeltaOp[] }
    if (!Array.isArray(parsed.ops)) return fail('task content is not a Quill delta')
    return { ops: parsed.ops }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

// A token was supplied, so the user expects a lossless pull; say why it degraded
// rather than silently falling back to markdown_description.
function fail(reason: string): undefined {
  console.error(`warning: lossless pull failed (${reason}); falling back to markdown export`)
  return undefined
}
