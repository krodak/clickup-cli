import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export async function editComment(
  config: Config,
  commentId: string,
  text: string | undefined,
  resolved?: boolean,
): Promise<void> {
  if (text === undefined && resolved === undefined) {
    throw new Error('Provide at least one of: --message, --resolved, --unresolved')
  }
  if (text !== undefined && !text.trim()) throw new Error('Comment text cannot be empty')
  const client = new ClickUpClient(config)
  await client.updateComment(commentId, text ?? '', resolved)
}
