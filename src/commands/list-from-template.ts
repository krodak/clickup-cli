import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

interface ListFromTemplateOptions {
  space?: string
  folder?: string
}

export async function createListFromTemplate(
  config: Config,
  name: string,
  opts: ListFromTemplateOptions & { template: string },
): Promise<{ id: string }> {
  if (!name.trim()) throw new Error('List name cannot be empty')
  if (!opts.space && !opts.folder) {
    throw new Error('Provide --space or --folder to specify where to create the list')
  }
  if (opts.space && opts.folder) {
    throw new Error('Provide either --space or --folder, not both')
  }

  const client = new ClickUpClient(config)
  const containerType = opts.folder ? 'folder' : 'space'
  const containerId = (opts.folder ?? opts.space)!
  return client.createListFromTemplate(containerId, opts.template, name, containerType)
}
