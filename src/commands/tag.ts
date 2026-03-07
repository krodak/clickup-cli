import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

interface TagOptions {
  add?: string
  remove?: string
}

interface TagResult {
  taskId: string
  added: string[]
  removed: string[]
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)
}

export async function manageTags(
  config: Config,
  taskId: string,
  opts: TagOptions,
): Promise<TagResult> {
  if (!opts.add && !opts.remove) {
    throw new Error('Provide at least one of: --add, --remove')
  }

  const client = new ClickUpClient(config)
  const added: string[] = []
  const removed: string[] = []

  if (opts.add) {
    const tags = parseTags(opts.add)
    for (const tag of tags) {
      await client.addTagToTask(taskId, tag)
      added.push(tag)
    }
  }

  if (opts.remove) {
    const tags = parseTags(opts.remove)
    try {
      for (const tag of tags) {
        await client.removeTagFromTask(taskId, tag)
        removed.push(tag)
      }
    } catch (err) {
      if (added.length > 0) {
        const reason = err instanceof Error ? err.message : String(err)
        throw new Error(`Added tags: ${added.join(', ')}; but failed to remove: ${reason}`, {
          cause: err,
        })
      }
      throw err
    }
  }

  return { taskId, added, removed }
}
