import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { Doc } from '../api.js'

export async function listDocs(config: Config, query?: string): Promise<Doc[]> {
  const client = new ClickUpClient(config)
  const docs = await client.getDocs(config.teamId)
  if (query) {
    const lower = query.toLowerCase()
    return docs.filter(d => d.name.toLowerCase().includes(lower))
  }
  return docs
}

export function formatDocs(docs: Doc[]): string {
  if (docs.length === 0) return 'No docs found'
  return docs.map(d => `${chalk.bold(d.name)} ${chalk.dim(d.id)}`).join('\n')
}

export function formatDocsMarkdown(docs: Doc[]): string {
  if (docs.length === 0) return 'No docs found'
  return docs.map(d => `- **${d.name}** (${d.id})`).join('\n')
}
