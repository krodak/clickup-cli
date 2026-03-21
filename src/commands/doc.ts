import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { Doc, DocPage } from '../api.js'

export async function getDocInfo(
  config: Config,
  docId: string,
): Promise<{ doc: Doc; pages: DocPage[] }> {
  const client = new ClickUpClient(config)
  const [doc, pages] = await Promise.all([
    client.getDoc(config.teamId, docId),
    client.getDocPageListing(config.teamId, docId),
  ])
  return { doc, pages }
}

export function formatDocInfo(doc: Doc, pages: DocPage[], indent = 0): string {
  const lines: string[] = []
  if (indent === 0) {
    lines.push(`${chalk.bold(doc.name)} ${chalk.dim(doc.id)}`)
    if (pages.length === 0) {
      lines.push('  (no pages)')
    }
  }
  for (const page of pages) {
    const prefix = '  '.repeat(indent + 1)
    lines.push(`${prefix}${page.name} ${chalk.dim(page.id)}`)
    if (page.pages && page.pages.length > 0) {
      lines.push(formatDocInfo(doc, page.pages, indent + 1))
    }
  }
  return lines.join('\n')
}

export function formatDocInfoMarkdown(doc: Doc, pages: DocPage[], indent = 0): string {
  const lines: string[] = []
  if (indent === 0) {
    lines.push(`# ${doc.name}`)
    lines.push(`ID: ${doc.id}`)
    lines.push('')
    if (pages.length === 0) {
      lines.push('No pages.')
      return lines.join('\n')
    }
    lines.push('## Pages')
  }
  for (const page of pages) {
    const prefix = '  '.repeat(indent)
    lines.push(`${prefix}- **${page.name}** (${page.id})`)
    if (page.pages && page.pages.length > 0) {
      lines.push(formatDocInfoMarkdown(doc, page.pages, indent + 1))
    }
  }
  return lines.join('\n')
}

export async function getDocPage(config: Config, docId: string, pageId: string): Promise<DocPage> {
  const client = new ClickUpClient(config)
  return client.getDocPage(config.teamId, docId, pageId)
}

export async function getAllDocPages(config: Config, docId: string): Promise<DocPage[]> {
  const client = new ClickUpClient(config)
  return client.getDocPages(config.teamId, docId)
}

export function formatDocPages(pages: DocPage[]): string {
  if (pages.length === 0) return 'No pages found'
  return pages
    .map(p => {
      const header = `# ${p.name}\n`
      return header + (p.content ?? '')
    })
    .join('\n\n---\n\n')
}

export function formatDocPagesMarkdown(pages: DocPage[]): string {
  if (pages.length === 0) return 'No pages found'
  return pages
    .map(p => {
      const header = `# ${p.name}`
      return header + '\n\n' + (p.content ?? '')
    })
    .join('\n\n---\n\n')
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
