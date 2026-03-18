import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export async function manageTaskLink(
  config: Config,
  taskId: string,
  linksTo: string,
  remove: boolean,
): Promise<string> {
  const client = new ClickUpClient(config)
  if (remove) {
    await client.deleteTaskLink(taskId, linksTo)
    return `Removed link between ${taskId} and ${linksTo}`
  }
  await client.addTaskLink(taskId, linksTo)
  return `Linked ${taskId} to ${linksTo}`
}
