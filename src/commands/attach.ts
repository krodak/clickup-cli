import { ClickUpClient } from '../api.js'
import type { Attachment } from '../api.js'
import type { Config } from '../config.js'

export async function attachFile(
  config: Config,
  taskId: string,
  filePath: string,
): Promise<Attachment> {
  const { access } = await import('node:fs/promises')
  try {
    await access(filePath)
  } catch {
    throw new Error(`File not found: ${filePath}`)
  }
  const client = new ClickUpClient(config)
  return client.createTaskAttachment(taskId, filePath)
}
