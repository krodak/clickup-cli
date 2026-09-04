import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ClickUpClient, Doc, DocPage } from '../api.js'
import { slug } from './discover.js'
import { loadManifest, saveManifest } from './manifest.js'
import { plural } from '../util/plural.js'

type DocsClient = Pick<ClickUpClient, 'getAllDocs' | 'getDocPages' | 'getTeams' | 'getSpaces'>

export interface DocsExportOptions {
  root: string
  refresh: boolean
  log: (line: string) => void
}

export interface DocsExportSummary {
  docs: number
  pages: number
  skipped: number
  failed: Array<{ id: string; error: string }>
}

const PARENT_TYPES: Record<number, string> = {
  4: 'space',
  5: 'folder',
  6: 'list',
  7: 'everything',
  12: 'workspace',
  1: 'task',
}

export function docDirName(doc: Pick<Doc, 'id' | 'name'>): string {
  const s = doc.name ? slug(doc.name) : ''
  return s && s !== 'unnamed' ? `${s}-${doc.id}` : doc.id
}

export function pageFileName(page: { id: string; name: string | null | undefined }): string {
  const s = page.name ? slug(page.name) : ''
  return s && s !== 'unnamed' ? `${s}-${page.id}.md` : `${page.id}.md`
}

function pageDirName(page: { id: string; name: string | null | undefined }): string {
  return pageFileName(page).replace(/\.md$/, '')
}

function yamlString(v: string): string {
  return JSON.stringify(v)
}

function renderPage(page: DocPage, docId: string): string {
  const header = [
    '---',
    `id: ${page.id}`,
    `doc: ${docId}`,
    `title: ${page.name ? yamlString(page.name).slice(1, -1) : ''}`,
    ...(page.parent_page_id ? [`parent: ${page.parent_page_id}`] : []),
    ...(page.archived ? ['archived: true'] : []),
    ...(page.date_created ? [`created: ${new Date(page.date_created).toISOString()}`] : []),
    ...(page.date_updated ? [`updated: ${new Date(page.date_updated).toISOString()}`] : []),
    '---',
  ]
  return header.join('\n') + '\n\n' + (page.content ?? '') + '\n'
}

interface WrittenPage {
  page: DocPage
  relPath: string
  depth: number
}

/** Write a page tree; children go in a directory named after their parent page. */
function writePages(
  dir: string,
  docId: string,
  pages: DocPage[],
  prefix = '',
  depth = 0,
): WrittenPage[] {
  const out: WrittenPage[] = []
  for (const page of pages) {
    const file = pageFileName(page)
    const relPath = prefix ? `${prefix}/${file}` : file
    mkdirSync(join(dir, prefix), { recursive: true })
    writeFileSync(join(dir, relPath), renderPage(page, docId))
    out.push({ page, relPath, depth })
    if (page.pages?.length) {
      const childPrefix = prefix ? `${prefix}/${pageDirName(page)}` : pageDirName(page)
      out.push(...writePages(dir, docId, page.pages, childPrefix, depth + 1))
    }
  }
  return out
}

function docTitle(doc: Doc): string {
  return doc.name || `(unnamed ${doc.id})`
}

function renderDocReadme(doc: Doc, written: WrittenPage[], location: string): string {
  const lines = [
    `# ${docTitle(doc)}`,
    '',
    `Doc id: ${doc.id} · Location: ${location} · ${plural(written.length, 'page')}`,
    ...(doc.date_updated
      ? [`Last updated: ${new Date(Number(doc.date_updated)).toISOString()}`]
      : []),
    '',
    '## Pages',
    '',
  ]
  for (const w of written) {
    const name = w.page.name || `(untitled ${w.page.id})`
    const flag = w.page.archived ? ' (archived)' : ''
    lines.push(`${'    '.repeat(w.depth)}- [${name}](${w.relPath})${flag}`)
  }
  lines.push('')
  return lines.join('\n')
}

function renderDocsIndex(
  entries: Array<{ doc: Doc; dir: string; pages: number; location: string }>,
): string {
  const lines = [
    '# Docs',
    '',
    plural(entries.length, 'doc'),
    '',
    '| Doc | Location | Pages |',
    '| --- | --- | --- |',
  ]
  for (const e of entries.sort((a, b) => docTitle(a.doc).localeCompare(docTitle(b.doc)))) {
    lines.push(`| [${docTitle(e.doc)}](${e.dir}/README.md) | ${e.location} | ${e.pages} |`)
  }
  lines.push('')
  return lines.join('\n')
}

function countPages(pages: DocPage[]): number {
  return pages.reduce((n, p) => n + 1 + countPages(p.pages ?? []), 0)
}

export async function exportDocs(
  client: DocsClient,
  teamId: string,
  opts: DocsExportOptions,
): Promise<DocsExportSummary> {
  const manifest = loadManifest(opts.root)
  const docsRoot = join(opts.root, 'docs')
  mkdirSync(docsRoot, { recursive: true })

  const [docs, spaces, teams] = await Promise.all([
    client.getAllDocs(teamId),
    client.getSpaces(teamId),
    client.getTeams(),
  ])
  const spaceNames = new Map(spaces.map(s => [s.id, s.name]))
  const teamName = teams.find(t => t.id === teamId)?.name ?? teamId
  const locationOf = (doc: Doc): string => {
    const t = doc.parent ? (PARENT_TYPES[doc.parent.type] ?? `type ${doc.parent.type}`) : 'unknown'
    const id = doc.parent?.id ?? ''
    if (t === 'space') return `space ${spaceNames.get(id) ?? id}`
    if (t === 'workspace') return `workspace ${teamName}`
    return `${t} ${id}`
  }

  const summary: DocsExportSummary = { docs: 0, pages: 0, skipped: 0, failed: [] }
  const entries: Array<{ doc: Doc; dir: string; pages: number; location: string }> = []
  opts.log(`Plan [docs]: ${plural(docs.length, 'doc')} in workspace "${teamName}"`)

  for (const doc of docs) {
    const dir = docDirName(doc)
    const location = locationOf(doc)
    const cached = manifest.docs[doc.id]
    if (cached && !opts.refresh) {
      summary.skipped++
      entries.push({ doc, dir, pages: cached.pageCount, location })
      continue
    }
    try {
      const pages = await client.getDocPages(teamId, doc.id)
      const dirPath = join(docsRoot, dir)
      mkdirSync(dirPath, { recursive: true })
      writeFileSync(join(dirPath, 'doc.json'), JSON.stringify({ doc, pages }, null, 2) + '\n')
      const written = writePages(dirPath, doc.id, pages)
      writeFileSync(join(dirPath, 'README.md'), renderDocReadme(doc, written, location))
      const pageCount = countPages(pages)
      manifest.docs[doc.id] = {
        fetchedAt: new Date().toISOString(),
        name: doc.name,
        pageCount,
      }
      summary.docs++
      summary.pages += pageCount
      entries.push({ doc, dir, pages: pageCount, location })
      opts.log(
        `[docs] ${summary.docs + summary.skipped + summary.failed.length}/${docs.length} ${docTitle(doc)} (${plural(pageCount, 'page')})`,
      )
    } catch (err) {
      summary.failed.push({ id: doc.id, error: (err as Error).message })
    }
  }

  writeFileSync(join(docsRoot, 'README.md'), renderDocsIndex(entries))
  manifest.slices['docs'] = {
    kind: 'docs',
    scope: teamId,
    exportedAt: new Date().toISOString(),
    taskCount: 0,
  }
  if (!manifest.workspace) manifest.workspace = { id: teamId, name: teamName }
  saveManifest(opts.root, manifest)
  return summary
}
