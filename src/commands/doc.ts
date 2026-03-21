import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { DocPage } from '../api.js'

export async function getDocPage(config: Config, docId: string, pageId: string): Promise<DocPage> {
  const client = new ClickUpClient(config)
  return client.getDocPage(config.teamId, docId, pageId)
}

export async function createDoc(
  config: Config,
  title: string,
  content?: string,
): Promise<{ id: string; title: string }> {
  if (!title.trim()) throw new Error('Doc title cannot be empty')
  const client = new ClickUpClient(config)
  const doc = await client.createDoc(config.teamId, title, content)
  return { id: doc.id, title: doc.name ?? title }
}

export async function createDocPage(
  config: Config,
  docId: string,
  name: string,
  content?: string,
  parentPageId?: string,
): Promise<DocPage> {
  if (!name.trim()) throw new Error('Page name cannot be empty')
  const client = new ClickUpClient(config)
  return client.createDocPage(config.teamId, docId, name, content, parentPageId)
}

export async function editDocPage(
  config: Config,
  docId: string,
  pageId: string,
  updates: { name?: string; content?: string },
): Promise<DocPage> {
  if (!updates.name && !updates.content) {
    throw new Error('Provide --name or --content to update')
  }
  const client = new ClickUpClient(config)
  return client.editDocPage(config.teamId, docId, pageId, updates)
}
