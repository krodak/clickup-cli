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
    if (!res.ok) return undefined
    const json = (await res.json()) as { task?: { content?: string } }
    const raw = json.task?.content
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { ops?: DeltaOp[] }
    if (!Array.isArray(parsed.ops)) return undefined
    return { ops: parsed.ops }
  } catch {
    return undefined
  }
}
