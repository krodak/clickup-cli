import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { Doc } from '../api.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'

interface DocRow {
  name: string
  id: string
}

const DOC_COLUMNS: Column<DocRow>[] = [
  { key: 'id', label: 'ID', maxWidth: 15 },
  { key: 'name', label: 'Name', maxWidth: 60 },
]

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
  const rows: DocRow[] = docs.map(d => ({ name: d.name, id: d.id }))
  return formatTable(rows, DOC_COLUMNS)
}

export function formatDocsMarkdown(docs: Doc[]): string {
  if (docs.length === 0) return 'No docs found'
  return docs.map(d => `- **${d.name}** (${d.id})`).join('\n')
}
