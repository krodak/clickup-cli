import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface DependOptions {
  on?: string
  blocks?: string
  remove?: boolean
}

export async function manageDependency(
  config: Config,
  taskId: string,
  opts: DependOptions,
): Promise<string> {
  if (!opts.on && !opts.blocks) {
    throw new Error('Provide --on <taskId> or --blocks <taskId>')
  }
  if (opts.on && opts.blocks) {
    throw new Error('Provide only one of --on or --blocks per invocation')
  }

  const client = new ClickUpClient(config)

  if (opts.remove) {
    await client.deleteDependency(taskId, {
      dependsOn: opts.on,
      dependencyOf: opts.blocks,
    })
    if (opts.on) return `Removed dependency: ${taskId} no longer depends on ${opts.on}`
    return `Removed dependency: ${taskId} no longer blocks ${opts.blocks!}`
  }

  await client.addDependency(taskId, {
    dependsOn: opts.on,
    dependencyOf: opts.blocks,
  })
  if (opts.on) return `Added dependency: ${taskId} depends on ${opts.on}`
  return `Added dependency: ${taskId} blocks ${opts.blocks!}`
}
