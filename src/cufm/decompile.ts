import { embedType, isTextInsert } from '../rich-text/delta.js'
import type { DeltaOp } from '../rich-text/delta.js'
import { ALERT_TO_BANNER } from './schema.js'

const BANNER_TO_ALERT: Record<string, string> = Object.fromEntries(
  Object.entries(ALERT_TO_BANNER).map(([alert, color]) => [color, alert]),
)

function attrStr(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

/**
 * Quill allows a single text insert to span several lines (`"a\nb\n"`). The
 * decompiler's run collector treats each `\n` as its own op, so normalise
 * those inserts into text / newline pieces first (inline attributes stay on
 * the text pieces; the embedded newlines carry no line attributes).
 */
export function splitMultilineInserts(ops: DeltaOp[]): DeltaOp[] {
  const out: DeltaOp[] = []
  for (const op of ops) {
    if (typeof op.insert !== 'string' || op.insert === '\n' || !op.insert.includes('\n')) {
      out.push(op)
      continue
    }
    const parts = op.insert.split('\n')
    parts.forEach((part, idx) => {
      if (part !== '')
        out.push(op.attributes ? { insert: part, attributes: op.attributes } : { insert: part })
      if (idx < parts.length - 1) out.push({ insert: '\n' })
    })
  }
  return out
}

export interface SyncedContentBlock {
  id: string
  ops: DeltaOp[]
}

export interface DecompileOptions {
  syncBlocks?: readonly SyncedContentBlock[]
}

/** One inline span of a line: its text plus the Quill inline attributes covering it. */
interface Chunk {
  text: string
  attrs?: Record<string, unknown>
  /** Set for embeds rendered inline, so block-level matchers can recognise them. */
  embed?: string
}

/** A single Quill line: its inline chunks plus the attributes carried by its `\n`. */
interface Line {
  chunks: Chunk[]
  attrs: Record<string, unknown>
}

/**
 * A block that is already rendered markdown (embeds that always occupy whole
 * lines), or a Quill line awaiting block-level grouping.
 */
type Piece = { kind: 'raw'; lines: string[] } | { kind: 'line'; line: Line }

/** A rendered block. `tight` blocks (list items) are not blank-line separated. */
interface Block {
  lines: string[]
  tight: boolean
}

export function decompileCufm(rawOps: DeltaOp[], options: DecompileOptions = {}): string {
  const state: DecompileState = {
    syncBlocks: new Map(options.syncBlocks?.map(block => [block.id, block.ops]) ?? []),
    emittedSyncBlocks: new Set<string>(),
  }
  const pieces = collectPieces(splitMultilineInserts(rawOps), state)
  const lines = renderPieces(pieces, 0)
  return (
    lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  )
}

interface DecompileState {
  syncBlocks: Map<string, DeltaOp[]>
  emittedSyncBlocks: Set<string>
}

// ---------------------------------------------------------------------------
// Phase 1: ops -> pieces
// ---------------------------------------------------------------------------

function collectPieces(ops: DeltaOp[], state: DecompileState): Piece[] {
  const pieces: Piece[] = []
  let i = 0
  while (i < ops.length) {
    const op = ops[i]
    if (!op) break
    const kind = embedType(op.insert)

    if (kind === 'table_content') {
      pieces.push({ kind: 'raw', lines: ['::toc', '::'] })
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'divider') {
      pieces.push({ kind: 'raw', lines: ['---'] })
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'table-embed') {
      pieces.push({ kind: 'raw', lines: decompileTable(op) })
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'button') {
      const button = (op.insert as { button: { title?: string; url?: string; color?: string } })
        .button
      pieces.push({
        kind: 'raw',
        lines: [
          `::button{url="${button.url ?? ''}" color="${button.color ?? '#646464'}"}`,
          button.title ?? 'Button',
          '::',
        ],
      })
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'frame') {
      const frame = (op.insert as { frame: { src?: string } }).frame
      const height = op.attributes?.height
      const h = height !== undefined ? ` height="${attrStr(height)}"` : ''
      pieces.push({ kind: 'raw', lines: [`::frame{src="${frame.src ?? ''}"${h}}`, '::'] })
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'sync-block') {
      const id = (op.insert as { 'sync-block': { id?: string } })['sync-block'].id ?? ''
      const content = state.syncBlocks.get(id)
      const lines = [`::sync-block{id="${escapeAttr(id)}"}`]
      if (content && !state.emittedSyncBlocks.has(id)) {
        lines.push(...decompileCufm(content).trimEnd().split('\n'))
        state.emittedSyncBlocks.add(id)
      }
      lines.push('::')
      pieces.push({ kind: 'raw', lines })
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (typeof op.insert !== 'string' && !isInlineEmbed(kind)) {
      i += 1
      continue
    }

    const run = collectRun(ops, i)
    i = run.next
    pieces.push({ kind: 'line', line: run.line })
  }
  return pieces
}

const INLINE_EMBEDS = new Set(['user_mention', 'task_mention', 'doc_mention', 'image'])

function isInlineEmbed(kind: string | undefined): kind is string {
  return kind !== undefined && INLINE_EMBEDS.has(kind)
}

/** Render an embed that lives inside a paragraph rather than replacing it. */
function inlineEmbedText(op: DeltaOp, kind: string): string {
  if (kind === 'user_mention') {
    const user = (op.insert as { user_mention: { id?: number; name?: string } }).user_mention
    const name = user.name ?? String(user.id ?? '')
    return `:user[${name}]{id="${user.id ?? ''}"}`
  }
  if (kind === 'task_mention') {
    const task = (op.insert as { task_mention: { task_id?: string } }).task_mention
    return `:task[${task.task_id ?? ''}]`
  }
  if (kind === 'doc_mention') {
    const doc = (op.insert as { doc_mention: { viewId?: string; pageId?: string } }).doc_mention
    return `:doc{view="${doc.viewId ?? ''}" page="${doc.pageId ?? ''}"}`
  }
  const src = (op.insert as { image: string }).image
  const width = op.attributes?.width
  const widthAttr = width !== undefined ? `{width="${attrStr(width)}"}` : ''
  return `![](${src})${widthAttr}`
}

function collectRun(ops: DeltaOp[], start: number): { line: Line; next: number } {
  let i = start
  const chunks: Chunk[] = []
  let attrs: Record<string, unknown> = {}
  while (i < ops.length) {
    const op = ops[i]
    if (!op) break
    if (op.insert === '\n') {
      attrs = op.attributes ?? {}
      i += 1
      break
    }
    if (isTextInsert(op.insert)) {
      if (op.insert !== '') chunks.push({ text: op.insert, attrs: op.attributes })
      i += 1
      continue
    }
    const kind = embedType(op.insert)
    if (!isInlineEmbed(kind)) break
    chunks.push({ text: inlineEmbedText(op, kind), embed: kind })
    i += 1
  }
  return { line: { chunks, attrs }, next: i }
}

function skipFollowingNewline(ops: DeltaOp[], i: number): number {
  const next = ops[i + 1]
  if (next && next.insert === '\n') return i + 2
  return i + 1
}

// ---------------------------------------------------------------------------
// Inline formatting
// ---------------------------------------------------------------------------

interface Wrapper {
  /** Attributes consumed when this wrapper is applied. */
  keys: string[]
  /** Wrapper value for a chunk, or undefined when the chunk is not covered. */
  value(attrs: Record<string, unknown> | undefined): string | undefined
  wrap(inner: string, value: string): string
}

/**
 * Ordered outermost-first. `formatChunks` hoists each wrapper over the longest
 * run of chunks that shares it, so adjacent spans with the same emphasis emit
 * one pair of delimiters instead of colliding (`*a**b*` never happens).
 */
const WRAPPERS: Wrapper[] = [
  {
    keys: ['badge-class', 'color-class'],
    value: attrs => (attrs?.['badge-class'] ? attrStr(attrs['badge-class']) : undefined),
    wrap: (inner, value) => `:badge[${inner}]{color="${value}"}`,
  },
  {
    keys: ['color-class'],
    value: attrs =>
      attrs?.['color-class'] && !attrs['badge-class'] ? attrStr(attrs['color-class']) : undefined,
    wrap: (inner, value) => `[${inner}]{color="${value}"}`,
  },
  {
    keys: ['background-class'],
    value: attrs => (attrs?.['background-class'] ? attrStr(attrs['background-class']) : undefined),
    wrap: (inner, value) => `[${inner}]{highlight="${value}"}`,
  },
  {
    keys: ['underline'],
    value: attrs => (attrs?.underline ? 'underline' : undefined),
    wrap: inner => `[${inner}]{underline}`,
  },
  {
    keys: ['link'],
    value: attrs => (attrs?.link ? attrStr(attrs.link) : undefined),
    wrap: (inner, value) => `[${inner}](${value})`,
  },
  {
    keys: ['strike'],
    value: attrs => (attrs?.strike ? 'strike' : undefined),
    wrap: inner => hoistSpaces(inner, text => `~~${text}~~`),
  },
  {
    keys: ['bold'],
    value: attrs => (attrs?.bold ? 'bold' : undefined),
    wrap: inner => hoistSpaces(inner, text => `**${text}**`),
  },
  {
    keys: ['italic'],
    value: attrs => (attrs?.italic ? 'italic' : undefined),
    wrap: inner => hoistSpaces(inner, text => `*${text}*`),
  },
  {
    keys: ['code'],
    value: attrs => (attrs?.code ? 'code' : undefined),
    wrap: inner => `\`${inner}\``,
  },
]

/**
 * CommonMark will not open emphasis on whitespace, so move any padding outside
 * the delimiters rather than emitting `** x **`.
 */
function hoistSpaces(inner: string, wrap: (text: string) => string): string {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)
  const body = match?.[2]
  if (!match || !body) return inner
  return `${match[1] ?? ''}${wrap(body)}${match[3] ?? ''}`
}

function formatChunks(chunks: Chunk[]): string {
  if (chunks.length === 0) return ''
  const first = chunks[0]!
  for (const wrapper of WRAPPERS) {
    const value = wrapper.value(first.attrs)
    if (value === undefined) continue
    let end = 1
    while (end < chunks.length && wrapper.value(chunks[end]!.attrs) === value) end += 1
    const covered = chunks.slice(0, end).map(chunk => ({
      text: chunk.text,
      attrs: omitKeys(chunk.attrs, wrapper.keys),
    }))
    return wrapper.wrap(formatChunks(covered), value) + formatChunks(chunks.slice(end))
  }
  return first.text + formatChunks(chunks.slice(1))
}

function omitKeys(
  attrs: Record<string, unknown> | undefined,
  keys: string[],
): Record<string, unknown> | undefined {
  if (!attrs) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (!keys.includes(key)) out[key] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}

// ---------------------------------------------------------------------------
// Phase 2: pieces -> markdown, grouping lines that share a block container
// ---------------------------------------------------------------------------

function renderPieces(pieces: Piece[], depth: number): string[] {
  const blocks: Block[] = []
  /** Ordered-list numbering, reset whenever a non-list block interrupts it. */
  const list: ListState = { counters: new Map(), widths: new Map() }
  let i = 0
  while (i < pieces.length) {
    const piece = pieces[i]!
    if (piece.kind === 'raw') {
      resetList(list)
      blocks.push({ lines: piece.lines, tight: false })
      i += 1
      continue
    }

    const diagram = matchDiagram(pieces, i, depth)
    if (diagram) {
      resetList(list)
      blocks.push({ lines: diagram.lines, tight: false })
      i = diagram.next
      continue
    }

    const { attrs } = piece.line
    const codeBlock = codeBlockAttr(attrs)
    if (codeBlock) {
      resetList(list)
      const key = groupKey(attrs)
      const group = takeLines(pieces, i, line => groupKey(line.attrs) === key)
      blocks.push({ lines: renderCodeBlock(group, codeBlock, depth), tight: false })
      i += group.length
      continue
    }

    const bannerId = attrs['advanced-banner']
    if (bannerId) {
      resetList(list)
      const group = takeLines(pieces, i, line => line.attrs['advanced-banner'] === bannerId)
      blocks.push({ lines: renderBanner(group, attrs, depth), tight: false })
      i += group.length
      continue
    }

    const layoutId = columnsId(attrs)
    if (layoutId !== undefined) {
      resetList(list)
      const group = takeLines(pieces, i, line => columnsId(line.attrs) === layoutId)
      blocks.push({ lines: renderColumns(group, depth), tight: false })
      i += group.length
      continue
    }

    const quoteId = blockquoteId(attrs)
    if (quoteId !== undefined) {
      resetList(list)
      const group = takeLines(pieces, i, line => blockquoteId(line.attrs) === quoteId)
      blocks.push({ lines: renderQuote(group, attrs, depth), tight: false })
      i += group.length
      continue
    }

    if (listKind(attrs) === 'toggled') {
      resetList(list)
      const title = formatChunks(piece.line.chunks)
      const children: Piece[] = []
      let j = i + 1
      while (j < pieces.length) {
        const next = pieces[j]!
        if (next.kind !== 'line' || pieceDepth(next.line.attrs) <= depth) break
        children.push(next)
        j += 1
      }
      const pad = '  '.repeat(Math.max(pieceDepth(attrs) - depth, 0))
      blocks.push({
        lines: [
          `${pad}::toggle{title="${escapeAttr(title)}"}`,
          ...renderPieces(children, depth + 1),
          `${pad}::`,
        ],
        tight: false,
      })
      i = j
      continue
    }

    blocks.push(renderLine(piece.line, depth, list))
    i += 1
  }
  return joinBlocks(blocks)
}

const DIAGRAM_LANGUAGES = ['mermaid', 'tldraw'] as const

/**
 * Reverses `compileDiagram`: ClickUp stores a diagram as its rendered image
 * followed by a "<lang> source" toggle wrapping the fence body. The authored
 * CUFM was a plain ```<lang> fence, and push re-renders the image from it, so
 * collapse the pair back to the fence instead of pulling the artifact down.
 */
function matchDiagram(
  pieces: Piece[],
  start: number,
  depth: number,
): { lines: string[]; next: number } | undefined {
  let i = start
  const first = pieces[i]
  if (first?.kind !== 'line') return undefined
  // The rendered image is optional: it is absent when the render failed.
  if (isImageOnly(first.line)) {
    i += 1
  }
  const title = pieces[i]
  if (title?.kind !== 'line') return undefined
  if (listKind(title.line.attrs) !== 'toggled') return undefined
  if (pieceDepth(title.line.attrs) !== depth) return undefined
  const language = DIAGRAM_LANGUAGES.find(
    lang => formatChunks(title.line.chunks) === `${lang} source`,
  )
  if (!language) return undefined

  const body: string[] = []
  for (let j = i + 1; j < pieces.length; j++) {
    const piece = pieces[j]
    if (piece?.kind !== 'line') break
    const code = codeBlockAttr(piece.line.attrs)
    if (!code || code['code-block'] !== language) break
    if (pieceDepth(piece.line.attrs) !== depth + 1) break
    body.push(formatChunks(piece.line.chunks))
  }
  if (body.length === 0) return undefined

  return {
    lines: [`\`\`\`${language}`, ...body, '```'],
    next: i + 1 + body.length,
  }
}

function isImageOnly(line: Line): boolean {
  return (
    line.chunks.length === 1 &&
    line.chunks[0]?.embed === 'image' &&
    !line.attrs.list &&
    !line.attrs.header
  )
}

/** Blank-line separate every block except runs of adjacent list items. */
function joinBlocks(blocks: Block[]): string[] {
  const out: string[] = []
  blocks.forEach((block, idx) => {
    const previous = blocks[idx - 1]
    if (previous && !(previous.tight && block.tight)) out.push('')
    out.push(...block.lines)
  })
  return out
}

function takeLines(pieces: Piece[], start: number, match: (line: Line) => boolean): Line[] {
  const group: Line[] = []
  for (let i = start; i < pieces.length; i++) {
    const piece = pieces[i]!
    if (piece.kind !== 'line' || !match(piece.line)) break
    group.push(piece.line)
  }
  return group
}

function codeBlockAttr(attrs: Record<string, unknown>): Record<string, unknown> | undefined {
  const code = attrs['code-block']
  if (!code) return undefined
  return typeof code === 'object' ? (code as Record<string, unknown>) : { 'code-block': code }
}

/** Consecutive lines sharing this key are one fence in ClickUp. */
function groupKey(attrs: Record<string, unknown>): string {
  return JSON.stringify([attrs['code-block'] ?? null, attrs.indent ?? 0, attrs.list ?? null])
}

function blockquoteId(attrs: Record<string, unknown>): string | undefined {
  const quote = attrs.blockquote
  if (!quote) return undefined
  const id =
    typeof quote === 'object'
      ? attrStr((quote as { 'blockquote-id'?: unknown })['blockquote-id'])
      : ''
  return `${id}:${attrStr(attrs['blockquote-size'])}`
}

function listKind(attrs: Record<string, unknown>): string | undefined {
  return (attrs.list as { list?: string } | undefined)?.list
}

/**
 * Indent level used to decide toggle membership. Code blocks record their
 * nesting on the `code-block` payload rather than on the line itself.
 */
function pieceDepth(attrs: Record<string, unknown>): number {
  const code = codeBlockAttr(attrs)
  if (code && code['wrapper-indent'] !== undefined) return Number(code['wrapper-indent']) || 0
  return Number(attrs.indent ?? 0) || 0
}

function renderCodeBlock(
  group: Line[],
  codeBlock: Record<string, unknown>,
  depth: number,
): string[] {
  const lang = typeof codeBlock['code-block'] === 'string' ? codeBlock['code-block'] : ''
  const lineNumbers = codeBlock['code-block-line-numbers'] === 'true' ? ' {lineNumbers}' : ''
  const pad = '  '.repeat(Math.max(pieceDepth(group[0]?.attrs ?? {}) - depth, 0))
  const body = group.map(line => `${pad}${formatChunks(line.chunks)}`)
  return [`${pad}\`\`\`${lang}${lineNumbers}`, ...body, `${pad}\`\`\``]
}

function renderBanner(group: Line[], attrs: Record<string, unknown>, depth: number): string[] {
  const color = attrStr(attrs['advanced-banner-color']) || 'blue'
  const alert = BANNER_TO_ALERT[color]
  const inner = renderPieces(stripAttrs(group, BANNER_KEYS), depth)
  if (alert && !attrs['advanced-banner-icon']) {
    return [`> [!${alert}]`, ...inner.map(line => (line === '' ? '>' : `> ${line}`))]
  }
  const icon = parseBannerIcon(attrs['advanced-banner-icon'])
  const iconProp = icon ? ` icon="${icon}"` : ''
  return [`::banner{color="${color}"${iconProp}}`, ...inner, '::']
}

/**
 * A column layout tags each line with `<columnsId>_<columnId>`, so the prefix
 * groups the whole `::columns` block and the full value groups one column.
 */
function columnsId(attrs: Record<string, unknown>): string | undefined {
  const layout = attrs.layout
  if (typeof layout !== 'string') return undefined
  const [id] = layout.split('_')
  return id || undefined
}

const LAYOUT_KEYS = ['layout', 'layout-width']

function renderColumns(group: Line[], depth: number): string[] {
  const lines = ['::columns']
  let i = 0
  while (i < group.length) {
    const layout = group[i]!.attrs.layout
    const column: Line[] = []
    while (i < group.length && group[i]!.attrs.layout === layout) {
      column.push(group[i]!)
      i += 1
    }
    const width = attrStr(column[0]?.attrs['layout-width'])
    const widthProp = width ? `{width="${width}"}` : ''
    lines.push(`  :::column${widthProp}`)
    for (const line of renderPieces(stripAttrs(column, LAYOUT_KEYS), depth)) {
      lines.push(line === '' ? '' : `  ${line}`)
    }
    lines.push('  :::')
  }
  lines.push('::')
  return lines
}

const BANNER_KEYS = ['advanced-banner', 'advanced-banner-color', 'advanced-banner-icon']
const QUOTE_KEYS = ['blockquote', 'blockquote-size']

function renderQuote(group: Line[], attrs: Record<string, unknown>, depth: number): string[] {
  const inner = renderPieces(stripAttrs(group, QUOTE_KEYS), depth)
  if (attrs['blockquote-size'] === 'large') {
    return ['::quote{size="large"}', ...inner, '::']
  }
  return inner.map(line => (line === '' ? '>' : `> ${line}`))
}

function stripAttrs(group: Line[], keys: string[]): Piece[] {
  return group.map(line => ({
    kind: 'line' as const,
    line: { chunks: line.chunks, attrs: omitKeys(line.attrs, keys) ?? {} },
  }))
}

/** Per-indent ordered-list position and marker width, reset when a list ends. */
interface ListState {
  counters: Map<number, number>
  /** Marker widths of enclosing levels, so children indent past the parent marker. */
  widths: Map<number, number>
}

function renderLine(line: Line, depth: number, list: ListState): Block {
  const { attrs } = line
  const text = formatChunks(line.chunks)

  const header = attrs.header
  if (typeof header === 'number') {
    resetList(list)
    const align = attrs.align ? ` {align="${attrStr(attrs.align)}"}` : ''
    return { lines: [`${'#'.repeat(header)} ${text.trimEnd()}${align}`], tight: false }
  }

  const kind = listKind(attrs)
  const raw = Math.max(Number(attrs.indent ?? 0) - depth, 0)

  if (kind === 'bullet' || kind === 'checked' || kind === 'unchecked' || kind === 'ordered') {
    // Markdown has no orphan nesting: an item can only be one level deeper than
    // the innermost open one, so clamp rather than emit an indent that a
    // re-compile would silently flatten back to the top level.
    const open = list.widths.size === 0 ? -1 : Math.max(...list.widths.keys())
    const indent = Math.min(raw, open + 1)
    resetDeeper(list, indent)
    let marker: string
    // Children indent to the parent's content column, which is one past the
    // list marker itself. A task-list `[x]` is content, not marker, so a
    // checkbox item nests at two like any other bullet.
    let markerWidth: number
    if (kind === 'ordered') {
      const next = (list.counters.get(indent) ?? 0) + 1
      list.counters.set(indent, next)
      marker = `${next}.`
      markerWidth = marker.length + 1
    } else {
      list.counters.delete(indent)
      marker = kind === 'bullet' ? '-' : kind === 'checked' ? '- [x]' : '- [ ]'
      markerWidth = 2
    }
    const pad = listPad(list, indent)
    list.widths.set(indent, markerWidth)
    return { lines: [`${pad}${marker} ${text}`], tight: true }
  }

  resetList(list)
  const pad = '  '.repeat(raw)
  if (attrs.align) {
    return { lines: [`${pad}${text.trimEnd()} {align="${attrStr(attrs.align)}"}`], tight: false }
  }
  if (attrs['color-class'] || attrs['block-color']) {
    const color = attrs['color-class'] ? `color="${attrStr(attrs['color-class'])}"` : ''
    const bg = attrs['block-color'] ? ` background="${attrStr(attrs['block-color'])}"` : ''
    return { lines: [`${pad}${text.trimEnd()} {${color}${bg}}`.replace('{ ', '{')], tight: false }
  }
  return { lines: [`${pad}${text}`], tight: false }
}

function listPad(list: ListState, indent: number): string {
  let width = 0
  for (let level = 0; level < indent; level++) width += list.widths.get(level) ?? 2
  return ' '.repeat(width)
}

function resetList(list: ListState): void {
  list.counters.clear()
  list.widths.clear()
}

function resetDeeper(list: ListState, indent: number): void {
  for (const key of [...list.counters.keys()]) {
    if (key > indent) list.counters.delete(key)
  }
  for (const key of [...list.widths.keys()]) {
    if (key > indent) list.widths.delete(key)
  }
}

function parseBannerIcon(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  try {
    const parsed = JSON.parse(raw) as { value?: string }
    const value = parsed.value ?? ''
    return value.replace(/^emoji::/, '') || undefined
  } catch {
    return undefined
  }
}

function decompileTable(op: DeltaOp): string[] {
  const table = (op.insert as { 'table-embed': TableEmbed })['table-embed']
  const widths = table.columns.map(c => c.attributes?.width).filter((w): w is string => Boolean(w))
  const colCount = table.columns.length
  const rowCount = table.rows.length
  const lines: string[] = []
  if (widths.length > 0) lines.push(`::table{widths="${widths.join(',')}"}`)
  for (let r = 1; r <= rowCount; r++) {
    const cells: string[] = []
    for (let c = 1; c <= colCount; c++) {
      const cell = table.cells[`${r}:${c}`]
      cells.push(cellText(cell?.content ?? []))
    }
    lines.push(`| ${cells.join(' | ')} |`)
    if (r === 1) {
      lines.push(`| ${cells.map(() => '---').join(' | ')} |`)
    }
  }
  if (widths.length > 0) lines.push('::')
  return lines
}

interface TableEmbed {
  rows: Array<{ insert: { id: string } }>
  columns: Array<{ insert: { id: string }; attributes?: { width?: string } }>
  cells: Record<string, { content: DeltaOp[] }>
}

/**
 * Cell content is its own mini-delta: it keeps inline attributes and, as
 * returned by ClickUp, folds the trailing newline into the text insert.
 */
function cellText(content: DeltaOp[]): string {
  const ops = splitMultilineInserts(content)
  const rendered: string[] = []
  let i = 0
  while (i < ops.length) {
    const run = collectRun(ops, i)
    if (run.next === i) break
    i = run.next
    rendered.push(formatChunks(run.line.chunks))
  }
  return rendered
    .filter(line => line !== '')
    .join('<br>')
    .replaceAll('|', '\\|')
}

function escapeAttr(value: string): string {
  return value.replaceAll('"', '\\"')
}
