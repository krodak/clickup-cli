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
  const doc = await client.createDoc(config.teamId, title)

  // ClickUp creates the Doc with a single unnamed, empty root page. Create Doc
  // accepts neither a page name nor content, so name that page after the Doc and
  // write any initial content through the page-edit endpoint.
  try {
    const pages = await client.getDocPageListing(config.teamId, doc.id)
    const rootPage = pages[0]
    if (!rootPage) throw new Error('the doc has no root page')
    await client.editDocPage(config.teamId, doc.id, rootPage.id, {
      name: title,
      ...(content !== undefined ? { content } : {}),
    })
  } catch (err) {
    throw new Error(
      `Created doc ${doc.id} but could not write its root page: ${(err as Error).message}`,
      { cause: err },
    )
  }

  return { id: doc.id, title: doc.name || title }
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

/**
 * ClickUp's public API exposes no delete-Doc endpoint; the request returns HTTP
 * 405. Fail immediately with an actionable message rather than sending a call
 * that cannot succeed.
 */
export async function deleteDoc(docId: string): Promise<never> {
  throw new Error(
    `Cannot delete doc ${docId}: ClickUp's public API does not support deleting Docs ` +
      `(no delete endpoint exists; the request returns HTTP 405). Delete or archive the ` +
      `Doc in the ClickUp UI instead. To remove a single page, use \`cup doc-page-delete <docId> <pageId>\`.`,
  )
}

export async function deleteDocPage(config: Config, docId: string, pageId: string): Promise<void> {
  const client = new ClickUpClient(config)
  await client.deleteDocPage(config.teamId, docId, pageId)
}
