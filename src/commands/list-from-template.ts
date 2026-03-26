import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface CreateListFromTemplateOptions {
  template?: string
  space?: string
  folder?: string
}

export async function createListFromTemplate(
  config: Config,
  name: string,
  options: CreateListFromTemplateOptions,
): Promise<{ id: string; name: string }> {
  if (!name.trim()) throw new Error('List name cannot be empty')
  if (!options.template) throw new Error('Provide --template with a list template ID')
  if (!options.space && !options.folder) {
    throw new Error('Provide --space or --folder to specify where to create the list')
  }
  if (options.space && options.folder) {
    throw new Error('Provide either --space or --folder, not both')
  }

  const client = new ClickUpClient(config)
  const containerId = options.folder ?? options.space
  const containerType = options.folder ? 'folder' : 'space'
  const result = await client.createListFromTemplate(
    containerId!,
    options.template,
    name,
    containerType,
  )

  return { id: result.id, name }
}
