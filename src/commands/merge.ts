import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { isTTY } from '../output.js'

interface MergeOptions {
  confirm?: boolean
}

interface MergeResult {
  sourceTaskId: string
  intoTaskId: string
  merged: boolean
}

export async function mergeCommand(
  config: Config,
  sourceTaskId: string,
  intoTaskId: string,
  opts: MergeOptions,
): Promise<MergeResult> {
  const client = new ClickUpClient(config)

  if (!opts.confirm) {
    if (!isTTY()) {
      throw new Error('Destructive operation requires --confirm flag in non-interactive mode')
    }
    const { confirm } = await import('@inquirer/prompts')
    const confirmed = await confirm({
      message: `Merge task ${sourceTaskId} into ${intoTaskId}? The source task becomes a subtask of the target.`,
      default: false,
    })
    if (!confirmed) {
      throw new Error('Cancelled')
    }
  }

  await client.mergeTasks(intoTaskId, [sourceTaskId])
  return { sourceTaskId, intoTaskId, merged: true }
}
