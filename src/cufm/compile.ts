import type { Token } from 'markdown-it'
import { embedOp, listAttr, newlineOp, textOp } from '../rich-text/delta.js'
import type { DeltaOp, ListKind } from '../rich-text/delta.js'
import { sequentialIdFactory, type IdFactory } from './ids.js'
import { parseCufm, tokenAttr, tokenAttrMap } from './parse.js'
import {
  ALERT_TO_BANNER,
  clampHeader,
  estimateColumnWidth,
  isBlockComponent,
  isInlineComponent,
} from './schema.js'

export interface DiagramRenderResult {
  url: string
  width?: number
  naturalWidth?: number
  naturalHeight?: number
  dataId?: string
}

export type MermaidRenderResult = DiagramRenderResult

export interface ResolvedImage {
  url: string
  width?: number
  naturalWidth?: number
  naturalHeight?: number
  dataId?: string
}

export interface CompileOptions {
  ids?: IdFactory
  resolveImage?: (src: string, width?: number) => ResolvedImage | undefined
  renderMermaid?: (source: string, meta: Record<string, string>) => DiagramRenderResult | undefined
  renderTldraw?: (source: string, meta: Record<string, string>) => DiagramRenderResult | undefined
  warnings?: string[]
}

export interface CompileResult {
  ops: DeltaOp[]
  syncBlocks: CompiledSyncBlock[]
  warnings: string[]
}

export interface CompiledSyncBlock {
  id: string
  ops: DeltaOp[]
}

const MENTION_RE = /<@(\d+)>/g

export function compileCufm(source: string, options: CompileOptions = {}): CompileResult {
  const warnings = options.warnings ?? []
  const ids = options.ids ?? sequentialIdFactory()
  const tokens = parseCufm(source)
  const syncBlocks = new Map<string, DeltaOp[]>()
  const ctx: Ctx = {
    ids,
    options,
    warnings,
    syncBlocks,
    indent: 0,
    sourceLines: sourceLines(source),
  }
  const ops = compileBlocks(tokens, 0, tokens.length, ctx)
  ensureTrailingNewline(ops)
  return {
    ops,
    syncBlocks: [...syncBlocks].map(([id, blockOps]) => ({ id, ops: blockOps })),
    warnings,
  }
}

export interface DiagramSource {
  language: 'mermaid' | 'tldraw'
  source: string
  meta: Record<string, string>
}

/**
 * Every mermaid/tldraw block in a document, with the exact source `compileCufm` will hand to the
 * matching renderer. Pre-rendering (see `compileForTask`) keys its cache off these strings, so it
 * has to see the same bytes the compiler does — hence one parser-backed extractor, not a regex.
 */
export function collectDiagramSources(markdown: string): DiagramSource[] {
  const tokens = parseCufm(markdown)
  const lines = sourceLines(markdown)
  const out: DiagramSource[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token) continue
    if (token.type === 'fence') {
      const { lang, meta } = parseFenceInfo(token.info)
      if (lang === 'mermaid' || lang === 'tldraw') {
        out.push({ language: lang, source: token.content.replace(/\n$/, ''), meta })
      }
      continue
    }
    if (token.type !== 'mdc_block_open') continue
    const name = token.info || token.tag
    if (name !== 'mermaid' && name !== 'tldraw') continue
    const close = findClose(tokens, i, 'mdc_block_close')
    out.push({
      language: name,
      source: componentBody(token, tokens, i + 1, close, lines),
      meta: tokenAttrMap(token),
    })
  }
  return out
}

interface Ctx {
  ids: IdFactory
  options: CompileOptions
  warnings: string[]
  syncBlocks: Map<string, DeltaOp[]>
  indent: number
  sourceLines: string[]
}

function compileBlocks(tokens: Token[], start: number, end: number, ctx: Ctx): DeltaOp[] {
  const ops: DeltaOp[] = []
  let i = start
  while (i < end) {
    const token = tokens[i]
    if (!token) break
    switch (token.type) {
      case 'heading_open': {
        const close = findClose(tokens, i, 'heading_close')
        const inner = innerInline(tokens, i, close)
        const level = clampHeader(Number(token.tag.slice(1) || '1'))
        const inline = compileInline(inner, ctx)
        const lineAttrs = liftLineAttrs(inline)
        ops.push(...inline)
        ops.push(newlineOp({ header: level, ...blockExtra(token), ...lineAttrs }))
        i = close + 1
        break
      }
      case 'paragraph_open': {
        const close = findClose(tokens, i, 'paragraph_close')
        const inner = innerInline(tokens, i, close)
        const inline = compileInline(inner, ctx)
        const extra = { ...blockExtra(token), ...liftLineAttrs(inline) }
        ops.push(...inline)
        ops.push(newlineOp(Object.keys(extra).length > 0 ? extra : undefined))
        i = close + 1
        break
      }
      case 'bullet_list_open':
      case 'ordered_list_open': {
        const closeType =
          token.type === 'bullet_list_open' ? 'bullet_list_close' : 'ordered_list_close'
        const close = findClose(tokens, i, closeType)
        const kind: ListKind = token.type === 'ordered_list_open' ? 'ordered' : 'bullet'
        ops.push(...compileList(tokens, i + 1, close, ctx, kind))
        i = close + 1
        break
      }
      case 'blockquote_open': {
        const close = findClose(tokens, i, 'blockquote_close')
        ops.push(...compileBlockquote(tokens, i, close, ctx))
        i = close + 1
        break
      }
      case 'fence': {
        const fence = compileFence(token, ctx)
        if (endsWithCodeBlock(ops) && containsCodeBlock(fence)) ops.push(newlineOp())
        ops.push(...fence)
        i += 1
        break
      }
      case 'hr': {
        ops.push(embedOp({ divider: true }))
        i += 1
        break
      }
      case 'table_open': {
        const close = findClose(tokens, i, 'table_close')
        ops.push(...compileTable(tokens, i, close, ctx, undefined))
        i = close + 1
        break
      }
      case 'mdc_block_open': {
        const close = findClose(tokens, i, 'mdc_block_close')
        ops.push(...compileComponent(token, tokens, i + 1, close, ctx))
        i = close + 1
        break
      }
      case 'html_block': {
        ops.push(...compileHtmlBlock(token.content, ctx))
        i += 1
        break
      }
      default:
        i += 1
        break
    }
  }
  return ops
}

function endsWithCodeBlock(ops: DeltaOp[]): boolean {
  return Boolean(ops.at(-1)?.attributes?.['code-block'])
}

function containsCodeBlock(ops: DeltaOp[]): boolean {
  return ops.some(op => Boolean(op.attributes?.['code-block']))
}

function compileList(
  tokens: Token[],
  start: number,
  end: number,
  ctx: Ctx,
  kind: ListKind,
): DeltaOp[] {
  const ops: DeltaOp[] = []
  let i = start
  while (i < end) {
    const token = tokens[i]
    if (!token) break
    if (token.type !== 'list_item_open') {
      i += 1
      continue
    }
    const close = findClose(tokens, i, 'list_item_close')
    const itemKind = listItemKind(token, tokens, i, close, kind)
    const childCtx: Ctx = { ...ctx, indent: ctx.indent }
    let j = i + 1
    let emittedItemLine = false
    while (j < close) {
      const child = tokens[j]
      if (!child) break
      if (child.type === 'paragraph_open') {
        const pClose = findClose(tokens, j, 'paragraph_close')
        const inner = innerInline(tokens, j, pClose)
        ops.push(
          ...compileInline(
            itemKind === 'checked' || itemKind === 'unchecked' ? stripTaskListPrefix(inner) : inner,
            ctx,
          ),
        )
        const attrs: Record<string, unknown> = { ...listAttr(itemKind) }
        if (ctx.indent > 0) attrs.indent = ctx.indent
        ops.push(newlineOp(attrs))
        emittedItemLine = true
        j = pClose + 1
        continue
      }
      if (child.type === 'bullet_list_open' || child.type === 'ordered_list_open') {
        const nestedKind: ListKind = child.type === 'ordered_list_open' ? 'ordered' : 'bullet'
        const nestedClose =
          child.type === 'bullet_list_open'
            ? findClose(tokens, j, 'bullet_list_close')
            : findClose(tokens, j, 'ordered_list_close')
        ops.push(
          ...compileList(
            tokens,
            j + 1,
            nestedClose,
            { ...childCtx, indent: ctx.indent + 1 },
            nestedKind,
          ),
        )
        j = nestedClose + 1
        continue
      }
      if (child.type === 'mdc_block_open') {
        const nestedClose = findClose(tokens, j, 'mdc_block_close')
        ops.push(
          ...compileComponent(child, tokens, j + 1, nestedClose, {
            ...ctx,
            indent: ctx.indent + 1,
          }),
        )
        j = nestedClose + 1
        continue
      }
      // Any other block (fence, blockquote, table, heading, hr, html) nested in the
      // item: compile it with the generic block compiler instead of dropping it.
      const closeType = child.type.endsWith('_open') ? child.type.replace(/_open$/, '_close') : null
      const childEnd = closeType ? findClose(tokens, j, closeType) : j
      ops.push(...compileBlocks(tokens, j, childEnd + 1, { ...ctx, indent: ctx.indent + 1 }))
      j = childEnd + 1
    }
    if (!emittedItemLine) {
      const attrs: Record<string, unknown> = { ...listAttr(itemKind) }
      if (ctx.indent > 0) attrs.indent = ctx.indent
      ops.push(newlineOp(attrs))
    }
    i = close + 1
  }
  return ops
}

function listItemKind(
  itemOpen: Token,
  tokens: Token[],
  start: number,
  end: number,
  fallback: ListKind,
): ListKind {
  const cls = tokenAttr(itemOpen, 'class') ?? ''
  if (!cls.includes('task-list-item')) return fallback
  for (let i = start; i < end; i++) {
    const t = tokens[i]
    if (t?.type !== 'inline' || !t.children) continue
    for (const c of t.children) {
      if (c.type === 'html_inline' && c.content.includes('task-list-item-checkbox')) {
        return /\bchecked\b/.test(c.content) ? 'checked' : 'unchecked'
      }
    }
  }
  return 'unchecked'
}

function compileBlockquote(tokens: Token[], openIndex: number, close: number, ctx: Ctx): DeltaOp[] {
  const innerTokens = tokens.slice(openIndex + 1, close)
  const firstInline = innerTokens.find(t => t.type === 'inline')
  const alert = firstInline ? matchAlert(firstInline) : undefined
  if (alert) {
    const color = ALERT_TO_BANNER[alert] ?? 'blue'
    const bannerId = ctx.ids.uuid()
    const bodyTokens = stripAlertFromTokens(innerTokens)
    const body = compileBlocks(bodyTokens, 0, bodyTokens.length, ctx)
    applyLineAttr(body, {
      'advanced-banner': bannerId,
      'advanced-banner-color': color,
    })
    return body.length > 0
      ? body
      : [newlineOp({ 'advanced-banner': bannerId, 'advanced-banner-color': color })]
  }
  const quoteId = ctx.ids.short('quote')
  const body = compileBlocks(innerTokens, 0, innerTokens.length, ctx)
  applyLineAttr(body, { blockquote: { 'blockquote-id': quoteId } })
  return body
}

function matchAlert(token: Token): string | undefined {
  const raw = token.content.trimStart()
  const sourceMatch = /^\[!([A-Z]+)\](?:\r?\n|$)/.exec(raw)
  if (sourceMatch && ALERT_TO_BANNER[sourceMatch[1]!]) return sourceMatch[1]
  const firstLine = inlinePlain(token).trimStart().split('\n', 1)[0] ?? ''
  const parsedMatch = /^!?([A-Z]+)$/.exec(firstLine)
  if (parsedMatch && ALERT_TO_BANNER[parsedMatch[1]!] && raw.includes('[!')) {
    return parsedMatch[1]
  }
  return undefined
}

function stripAlertFromTokens(tokens: Token[]): Token[] {
  let stripped = false
  return tokens.map(t => {
    if (stripped || t.type !== 'inline' || !t.children || !matchAlert(t)) return t
    const breakIndex = t.children.findIndex(c => c.type === 'softbreak' || c.type === 'hardbreak')
    const children = breakIndex >= 0 ? t.children.slice(breakIndex + 1) : []
    const clone = Object.create(t) as Token
    clone.children = children
    clone.content = children.map(plainOf).join('')
    stripped = true
    return clone
  })
}

function compileFence(token: Token, ctx: Ctx): DeltaOp[] {
  const { lang, meta } = parseFenceInfo(token.info)
  const body = token.content.replace(/\n$/, '')
  if (lang === 'mermaid') {
    return compileMermaid(body, meta, ctx)
  }
  if (lang === 'tldraw') {
    return compileTldraw(body, meta, ctx)
  }
  const codeBlock: Record<string, unknown> = { 'code-block': lang || true }
  if (meta.lineNumbers === 'true' || meta.lineNumbers === '' || 'lineNumbers' in meta) {
    codeBlock['code-block-line-numbers'] = 'true'
  }
  const attrs: Record<string, unknown> = { 'code-block': codeBlock }
  if (ctx.indent > 0) attrs.indent = ctx.indent
  return compileCodeLines(body, attrs)
}

function compileMermaid(source: string, meta: Record<string, string>, ctx: Ctx): DeltaOp[] {
  const rendered = ctx.options.renderMermaid?.(source, meta)
  return compileDiagram(source, meta, 'mermaid', rendered, Boolean(ctx.options.renderMermaid), ctx)
}

function compileTldraw(source: string, meta: Record<string, string>, ctx: Ctx): DeltaOp[] {
  const rendered = ctx.options.renderTldraw?.(source, meta)
  return compileDiagram(source, meta, 'tldraw', rendered, Boolean(ctx.options.renderTldraw), ctx)
}

function compileDiagram(
  source: string,
  meta: Record<string, string>,
  language: 'mermaid' | 'tldraw',
  rendered: DiagramRenderResult | undefined,
  rendererConfigured: boolean,
  ctx: Ctx,
): DeltaOp[] {
  const ops: DeltaOp[] = []
  if (rendered) {
    const imgAttrs: Record<string, unknown> = {}
    if (rendered.width !== undefined) imgAttrs.width = String(rendered.width)
    if (meta.width) imgAttrs.width = meta.width
    if (rendered.naturalWidth !== undefined)
      imgAttrs['data-natural-width'] = String(rendered.naturalWidth)
    if (rendered.naturalHeight !== undefined)
      imgAttrs['data-natural-height'] = String(rendered.naturalHeight)
    if (rendered.dataId) imgAttrs['data-id'] = rendered.dataId
    ops.push(
      embedOp({ image: rendered.url }, Object.keys(imgAttrs).length > 0 ? imgAttrs : undefined),
    )
    ops.push(newlineOp())
  } else if (!rendererConfigured) {
    ctx.warnings.push(`${language} fence compiled without renderer; emitting source toggle only`)
  } else {
    ctx.warnings.push(`${language} render failed; keeping source as inline code inside a toggle`)
  }
  const toggleId = ctx.ids.short('list')
  ops.push(textOp(`${language} source`))
  const titleAttrs: Record<string, unknown> = { ...listAttr('toggled', { 'toggle-id': toggleId }) }
  if (ctx.indent > 0) titleAttrs.indent = ctx.indent
  ops.push(newlineOp(titleAttrs))
  const bodyAttrs: Record<string, unknown> = {
    'code-block': {
      'code-block': language,
      'in-list': 'none',
      'wrapper-indent': String(ctx.indent + 1),
    },
  }
  ops.push(...compileCodeLines(source, bodyAttrs))
  return ops
}

function compileComponent(
  open: Token,
  tokens: Token[],
  start: number,
  close: number,
  ctx: Ctx,
): DeltaOp[] {
  const name = open.info || open.tag
  const props = tokenAttrMap(open)
  if (!isBlockComponent(name) && name !== 'column') {
    ctx.warnings.push(`Unknown CUFM component ::${name}`)
    const inner = tokensToPlain(tokens, start, close)
    return [
      textOp(`::${name}${formatProps(props)}\n${inner}\n::`),
      newlineOp({ 'code-block': { 'code-block': 'cufm' } }),
    ]
  }
  switch (name) {
    case 'toc':
      return [embedOp({ table_content: true })]
    case 'toggle':
      return compileToggle(props, tokens, start, close, ctx)
    case 'banner':
      return compileBanner(props, tokens, start, close, ctx)
    case 'quote':
      return compileQuote(props, tokens, start, close, ctx)
    case 'columns':
      return compileColumns(tokens, start, close, ctx)
    case 'column':
      return compileBlocks(tokens, start, close, ctx)
    case 'table':
      return compileWrappedTable(props, tokens, start, close, ctx)
    case 'button':
      return compileButton(props, tokens, start, close)
    case 'frame':
      return compileFrame(props)
    case 'mermaid':
      return compileMermaid(componentBody(open, tokens, start, close, ctx.sourceLines), props, ctx)
    case 'tldraw':
      return compileTldraw(componentBody(open, tokens, start, close, ctx.sourceLines), props, ctx)
    case 'attachment':
      return [
        embedOp({
          attachment: {
            name: props.name ?? 'file',
            url: props.url ?? '',
            extension: props.extension,
          },
        }),
        newlineOp(),
      ]
    case 'sync-block':
      return compileSyncBlock(props, tokens, start, close, ctx)
    case 'whiteboard':
      return [
        embedOp({
          embed_plugin: { pluginName: 'whiteboard', viewId: props.view ?? '', teamId: props.team },
        }),
        newlineOp(),
      ]
    case 'block-mention':
      return [
        embedOp({
          block_mention: {
            url: props.url ?? '',
            blockId: props.blockId,
            location: props.location ?? 'task',
            teamId: props.team,
            taskId: props.task,
          },
        }),
        newlineOp(),
      ]
    default:
      return compileBlocks(tokens, start, close, ctx)
  }
}

function compileSyncBlock(
  props: Record<string, string>,
  tokens: Token[],
  start: number,
  close: number,
  ctx: Ctx,
): DeltaOp[] {
  const id = props.id?.trim()
  if (!id) {
    ctx.warnings.push('::sync-block requires an id')
    return []
  }
  const body = compileBlocks(tokens, start, close, ctx)
  if (body.length > 0) {
    ensureTrailingNewline(body)
    if (ctx.syncBlocks.has(id)) {
      ctx.warnings.push(`::sync-block id "${id}" has more than one content definition`)
    } else {
      ctx.syncBlocks.set(id, body)
    }
  }
  return [embedOp({ 'sync-block': { id } })]
}

function compileToggle(
  props: Record<string, string>,
  tokens: Token[],
  start: number,
  close: number,
  ctx: Ctx,
): DeltaOp[] {
  const title = props.title ?? 'Toggle'
  const toggleId = ctx.ids.short('list')
  const ops: DeltaOp[] = [textOp(title)]
  const titleAttrs: Record<string, unknown> = { ...listAttr('toggled', { 'toggle-id': toggleId }) }
  if (ctx.indent > 0) titleAttrs.indent = ctx.indent
  ops.push(newlineOp(titleAttrs))
  const bodyCtx: Ctx = { ...ctx, indent: ctx.indent + 1 }
  const body = compileBlocks(tokens, start, close, bodyCtx)
  markToggleBody(body, ctx.indent + 1)
  ops.push(...body)
  return ops
}

function markToggleBody(ops: DeltaOp[], indent: number): void {
  for (const op of ops) {
    if (op.insert !== '\n') continue
    const attrs = { ...(op.attributes ?? {}) }
    const existingIndent = attrs.indent
    attrs.indent = typeof existingIndent === 'number' ? existingIndent : indent
    const codeBlock = attrs['code-block']
    if (typeof codeBlock === 'object' && codeBlock !== null) {
      attrs['code-block'] = {
        ...codeBlock,
        'in-list': 'none',
        'wrapper-indent': String(indent),
      }
      delete attrs.indent
    }
    const list = attrs.list as { list?: string } | undefined
    if (!list && !attrs['code-block']) {
      attrs.list = { list: 'none' }
    }
    op.attributes = attrs
  }
}

function compileBanner(
  props: Record<string, string>,
  tokens: Token[],
  start: number,
  close: number,
  ctx: Ctx,
): DeltaOp[] {
  const bannerId = ctx.ids.uuid()
  const extra: Record<string, unknown> = {
    'advanced-banner': bannerId,
    'advanced-banner-color': props.color ?? 'blue',
  }
  if (props.icon) {
    extra['advanced-banner-icon'] = JSON.stringify({
      value: `emoji::${props.icon}`,
      newAvatar: 'remove',
      changeType: 'emoji',
    })
  }
  const body = compileBlocks(tokens, start, close, ctx)
  applyLineAttr(body, extra)
  if (body.length === 0) body.push(newlineOp(extra))
  return body
}

function compileQuote(
  props: Record<string, string>,
  tokens: Token[],
  start: number,
  close: number,
  ctx: Ctx,
): DeltaOp[] {
  const quoteId = ctx.ids.short('quote')
  const extra: Record<string, unknown> = { blockquote: { 'blockquote-id': quoteId } }
  if (props.size) extra['blockquote-size'] = props.size
  const body = compileBlocks(tokens, start, close, ctx)
  applyLineAttr(body, extra)
  return body
}

function compileColumns(tokens: Token[], start: number, close: number, ctx: Ctx): DeltaOp[] {
  const group = ctx.ids.uuid()
  const ops: DeltaOp[] = []
  let i = start
  while (i < close) {
    const token = tokens[i]
    if (!token) break
    if (token.type === 'mdc_block_open' && (token.info === 'column' || token.tag === 'column')) {
      const colClose = findClose(tokens, i, 'mdc_block_close')
      const colId = ctx.ids.uuid()
      const width = tokenAttr(token, 'width') ?? '0.33'
      const layout = `${group}_${colId}`
      const body = compileBlocks(tokens, i + 1, colClose, ctx)
      applyLineAttr(body, { layout, 'layout-width': width })
      if (body.length === 0) {
        body.push(newlineOp({ layout, 'layout-width': width }))
      }
      ops.push(...body)
      i = colClose + 1
      continue
    }
    i += 1
  }
  return ops
}

function compileWrappedTable(
  props: Record<string, string>,
  tokens: Token[],
  start: number,
  close: number,
  ctx: Ctx,
): DeltaOp[] {
  const tableOpen = tokens.slice(start, close).findIndex(t => t.type === 'table_open')
  if (tableOpen < 0) return compileBlocks(tokens, start, close, ctx)
  const abs = start + tableOpen
  const tableClose = findClose(tokens, abs, 'table_close')
  const widths = props.widths
    ?.split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return compileTable(tokens, abs, tableClose, ctx, widths)
}

function compileTable(
  tokens: Token[],
  openIndex: number,
  close: number,
  ctx: Ctx,
  widths: string[] | undefined,
): DeltaOp[] {
  const rows: Token[][][] = []
  let currentRow: Token[][] = []
  let i = openIndex + 1
  while (i < close) {
    const token = tokens[i]
    if (!token) break
    if (token.type === 'tr_open') {
      currentRow = []
      i += 1
      continue
    }
    if (token.type === 'tr_close') {
      if (currentRow.length > 0) rows.push(currentRow)
      i += 1
      continue
    }
    if (token.type === 'th_open' || token.type === 'td_open') {
      const closeType = token.type === 'th_open' ? 'th_close' : 'td_close'
      const cellClose = findClose(tokens, i, closeType)
      const inline = innerInline(tokens, i, cellClose)
      currentRow.push(inline)
      i = cellClose + 1
      continue
    }
    i += 1
  }
  if (rows.length === 0) return [newlineOp()]

  const colCount = Math.max(...rows.map(r => r.length), 0)
  const auto = Array.from({ length: colCount }, (_, col) => {
    const max = rows.reduce(
      (m, row) => Math.max(m, inlinePlainFromChildren(row[col] ?? []).length),
      0,
    )
    return String(estimateColumnWidth(max))
  })
  const colWidths = Array.from(
    { length: colCount },
    (_, col) => widths?.[col] ?? auto[col] ?? '120',
  )

  const rowIds = rows.map(() => ({ insert: { id: ctx.ids.short('row') } }))
  const columns = colWidths.map(width => ({
    insert: { id: ctx.ids.short('column') },
    attributes: { width },
  }))
  const cells: Record<
    string,
    { content: DeltaOp[]; attributes: { colspan: string; rowspan: string } }
  > = {}
  rows.forEach((row, r) => {
    for (let c = 0; c < colCount; c++) {
      const inline = compileInline(row[c] ?? [], ctx)
      const lineAttrs = liftLineAttrs(inline)
      const content: DeltaOp[] = [
        ...inline,
        newlineOp(Object.keys(lineAttrs).length > 0 ? lineAttrs : undefined),
      ]
      cells[`${r + 1}:${c + 1}`] = {
        content,
        attributes: { colspan: '1', rowspan: '1' },
      }
    }
  })
  return [embedOp({ 'table-embed': { rows: rowIds, columns, cells } })]
}

function compileButton(
  props: Record<string, string>,
  tokens: Token[],
  start: number,
  close: number,
): DeltaOp[] {
  const title = tokensToPlain(tokens, start, close).trim() || props.title || 'Button'
  return [
    embedOp({
      button: {
        title,
        url: props.url ?? '',
        color: props.color ?? '#646464',
        align: props.align ?? 'left',
      },
    }),
    newlineOp(),
  ]
}

function compileFrame(props: Record<string, string>): DeltaOp[] {
  const src = props.src ?? props.url ?? ''
  const attrs: Record<string, unknown> = {}
  if (props.height) attrs.height = props.height
  return [
    embedOp(
      { frame: { id: src, service: 'custom', url: src.replace(/^https?:\/\//, ''), src } },
      Object.keys(attrs).length > 0 ? attrs : undefined,
    ),
    newlineOp(),
  ]
}

function compileHtmlBlock(html: string, ctx: Ctx): DeltaOp[] {
  ctx.warnings.push('Raw HTML block stored as a cufm code fence')
  return compileCodeLines(html.trim(), { 'code-block': { 'code-block': 'html' } })
}

interface InlineState {
  bold?: boolean
  italic?: boolean
  strike?: boolean
  code?: boolean
  link?: string
}

function compileInline(children: Token[] | undefined, ctx: Ctx): DeltaOp[] {
  if (!children || children.length === 0) return []
  const ops: DeltaOp[] = []
  const marks: InlineState = {}
  let i = 0
  let lastGroup: DeltaOp[] = []

  const flushText = (text: string, extra?: Record<string, unknown>) => {
    if (!text) return
    const chunks = splitMentions(text)
    for (const chunk of chunks) {
      if (chunk.type === 'mention') {
        const op = embedOp({ user_mention: { id: chunk.id, notify: true } })
        ops.push(op)
        lastGroup = [op]
        continue
      }
      const attrs = { ...markAttrs(marks), ...extra }
      const op = textOp(chunk.text, Object.keys(attrs).length > 0 ? attrs : undefined)
      ops.push(op)
      lastGroup = [op]
    }
  }

  while (i < children.length) {
    const token = children[i]
    if (!token) break
    switch (token.type) {
      case 'text':
        flushText(token.content)
        i += 1
        break
      case 'softbreak':
        // breaks:false -> a soft break is intra-paragraph whitespace. Emitting a bare
        // "\n" op would terminate the Quill line and strip its block attributes.
        flushText(' ')
        i += 1
        break
      case 'hardbreak':
        flushText('\n')
        i += 1
        break
      case 'strong_open':
        marks.bold = true
        i += 1
        break
      case 'strong_close':
        marks.bold = false
        i += 1
        break
      case 'em_open':
        marks.italic = true
        i += 1
        break
      case 'em_close':
        marks.italic = false
        i += 1
        break
      case 's_open':
        marks.strike = true
        i += 1
        break
      case 's_close':
        marks.strike = false
        i += 1
        break
      case 'code_inline':
        flushText(token.content, { code: true })
        i += 1
        break
      case 'link_open':
        marks.link = tokenAttr(token, 'href') ?? token.attrGet('href') ?? undefined
        i += 1
        break
      case 'link_close':
        marks.link = undefined
        i += 1
        break
      case 'image': {
        const src = tokenAttr(token, 'src') ?? token.attrGet('src') ?? ''
        let width: number | undefined
        const next = children[i + 1]
        if (next?.type === 'mdc_inline_props') {
          const w = tokenAttr(next, 'width')
          if (w) width = Number(w)
        }
        const resolved = ctx.options.resolveImage?.(src, width) ?? { url: src, width }
        const imgAttrs: Record<string, unknown> = {}
        const w = width ?? resolved.width
        if (w !== undefined) imgAttrs.width = String(w)
        if (resolved.naturalWidth !== undefined)
          imgAttrs['data-natural-width'] = String(resolved.naturalWidth)
        if (resolved.naturalHeight !== undefined)
          imgAttrs['data-natural-height'] = String(resolved.naturalHeight)
        if (resolved.dataId) imgAttrs['data-id'] = resolved.dataId
        const op = embedOp(
          { image: resolved.url },
          Object.keys(imgAttrs).length > 0 ? imgAttrs : undefined,
        )
        ops.push(op)
        lastGroup = [op]
        i += 1
        break
      }
      case 'mdc_inline_span': {
        if (token.nesting === 1 || token.nesting === 0) {
          const innerEnd = findInlineClose(children, i, 'mdc_inline_span')
          const inner = children.slice(i + 1, innerEnd)
          const innerOps = compileInline(inner, ctx)
          const propsTok = children[innerEnd + 1]
          const extra =
            propsTok?.type === 'mdc_inline_props' ? mapSpanProps(tokenAttrMap(propsTok)) : {}
          applyAttrsToOps(innerOps, extra)
          ops.push(...innerOps)
          lastGroup = innerOps
          i = innerEnd + 1
          if (propsTok?.type === 'mdc_inline_props') i += 1
        } else {
          i += 1
        }
        break
      }
      case 'mdc_inline_component': {
        if (token.nesting === 1 || token.nesting === 0) {
          const innerEnd = findInlineClose(children, i, 'mdc_inline_component')
          const innerText = children
            .slice(i + 1, innerEnd)
            .filter(c => c.type === 'text')
            .map(c => c.content)
            .join('')
          const propsTok = children[innerEnd + 1]
          const props = propsTok?.type === 'mdc_inline_props' ? tokenAttrMap(propsTok) : {}
          const name = token.tag || token.info || token.content
          ops.push(...compileInlineComponent(name, innerText, props, ctx))
          lastGroup = ops.slice(-1)
          i = innerEnd + 1
          if (propsTok?.type === 'mdc_inline_props') i += 1
        } else {
          i += 1
        }
        break
      }
      case 'mdc_inline_props': {
        applyAttrsToOps(lastGroup, mapSpanProps(tokenAttrMap(token)))
        i += 1
        break
      }
      case 'html_inline':
        ops.push(...compileHtmlInline(token.content, ctx))
        i += 1
        break
      default:
        if (token.children) ops.push(...compileInline(token.children, ctx))
        else if (token.content) flushText(token.content)
        i += 1
        break
    }
  }
  return ops
}

function compileInlineComponent(
  name: string,
  text: string,
  props: Record<string, string>,
  ctx: Ctx,
): DeltaOp[] {
  if (name === 'badge' || !isInlineComponent(name)) {
    if (name !== 'badge' && !isInlineComponent(name)) {
      ctx.warnings.push(`Unknown CUFM inline :${name}`)
    }
    const color = props.color ?? 'grey'
    return [textOp(text || name, { 'badge-class': color })]
  }
  if (name === 'user') {
    return [
      embedOp({
        user_mention: {
          id: props.id ? Number(props.id) : props.id,
          name: text || props.name,
          notify: true,
        },
      }),
    ]
  }
  if (name === 'task') {
    return [embedOp({ task_mention: { task_id: props.id ?? text } })]
  }
  if (name === 'doc') {
    return [
      embedOp({
        doc_mention: {
          teamId: props.team,
          viewId: props.view,
          pageId: props.page,
        },
      }),
    ]
  }
  return [textOp(text)]
}

function compileHtmlInline(html: string, ctx: Ctx): DeltaOp[] {
  if (html.includes('task-list-item-checkbox')) return []
  const u = /^<u>([\s\S]*)<\/u>$/i.exec(html)
  if (u) return [textOp(u[1] ?? '', { underline: true })]
  const br = /^<br\s*\/?>$/i.test(html)
  if (br) return [textOp('\n')]
  ctx.warnings.push('Unparsed html_inline preserved as text')
  return [textOp(html)]
}

function mapSpanProps(props: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (props.highlight) out['background-class'] = props.highlight
  if (props.color && !props.highlight) out['color-class'] = props.color
  if (props.underline !== undefined) out.underline = true
  if (props.background) out['block-color'] = props.background
  if (props.class?.includes('badge') && props.color) out['badge-class'] = props.color
  for (const [k, v] of Object.entries(props)) {
    if (
      k === 'highlight' ||
      k === 'color' ||
      k === 'underline' ||
      k === 'background' ||
      k === 'class'
    )
      continue
    if (k === 'width') continue
    out[k] = v
  }
  return out
}

function blockExtra(token: Token): Record<string, unknown> {
  const props = tokenAttrMap(token)
  const out: Record<string, unknown> = {}
  if (props.align) out.align = props.align
  if (props.color) out['color-class'] = props.color
  if (props.background) out['block-color'] = props.background
  return out
}

function markAttrs(marks: InlineState): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (marks.bold) out.bold = true
  if (marks.italic) out.italic = true
  if (marks.strike) out.strike = true
  if (marks.code) out.code = true
  if (marks.link) out.link = marks.link
  return out
}

function applyAttrsToOps(ops: DeltaOp[], extra: Record<string, unknown>): void {
  if (Object.keys(extra).length === 0) return
  for (const op of ops) {
    if (typeof op.insert === 'string') {
      op.attributes = { ...op.attributes, ...extra }
    } else if (embedTypeOf(op) === 'image' && extra.width !== undefined) {
      const width =
        typeof extra.width === 'string' || typeof extra.width === 'number'
          ? String(extra.width)
          : undefined
      if (width) op.attributes = { ...op.attributes, width }
    }
  }
}

function liftLineAttrs(ops: DeltaOp[]): Record<string, unknown> {
  const lineAttrs: Record<string, unknown> = {}
  for (const op of ops) {
    if (typeof op.insert !== 'string' || !op.attributes) continue
    if (op.attributes['block-color'] !== undefined) {
      lineAttrs['block-color'] = op.attributes['block-color']
      delete op.attributes['block-color']
    }
    if (Object.keys(op.attributes).length === 0) delete op.attributes
  }
  return lineAttrs
}

function compileCodeLines(
  body: string,
  attrs: Record<string, unknown>,
  textAttrs?: Record<string, unknown>,
): DeltaOp[] {
  const ops: DeltaOp[] = []
  for (const line of body.split('\n')) {
    if (line) ops.push(textOp(line, textAttrs ? { ...textAttrs } : undefined))
    ops.push(newlineOp({ ...attrs }))
  }
  return ops
}

function stripTaskListPrefix(children: Token[]): Token[] {
  let start = 0
  if (children[start]?.type === 'html_inline' && children[start]?.content.includes('checkbox')) {
    start += 1
  }
  if (
    children[start]?.type === 'mdc_inline_span' &&
    children[start]?.nesting === 1 &&
    children[start + 1]?.type === 'text' &&
    /^[ xX]$/.test(children[start + 1]?.content ?? '') &&
    children[start + 2]?.type === 'mdc_inline_span' &&
    children[start + 2]?.nesting === -1
  ) {
    start += 3
  }
  const rest = children.slice(start)
  const firstText = rest.findIndex(token => token.type === 'text')
  if (firstText >= 0) {
    const original = rest[firstText]!
    const clone = Object.create(original) as Token
    clone.content = original.content.replace(/^\s+/, '')
    rest[firstText] = clone
  }
  return rest
}

function embedTypeOf(op: DeltaOp): string | undefined {
  if (typeof op.insert !== 'object' || op.insert === null) return undefined
  return Object.keys(op.insert)[0]
}

function applyLineAttr(ops: DeltaOp[], extra: Record<string, unknown>): void {
  let applied = false
  for (const op of ops) {
    if (op.insert !== '\n') continue
    op.attributes = { ...op.attributes, ...extra }
    applied = true
  }
  if (!applied && ops.length > 0) {
    ops.push(newlineOp(extra))
  }
}

function findClose(tokens: Token[], openIndex: number, closeType: string): number {
  const open = tokens[openIndex]
  const openType = open?.type ?? ''
  let depth = 0
  for (let i = openIndex + 1; i < tokens.length; i++) {
    const t = tokens[i]
    if (!t) continue
    if (t.type === openType) depth += 1
    if (t.type === closeType) {
      if (depth === 0) return i
      depth -= 1
    }
  }
  return tokens.length - 1
}

function findInlineClose(children: Token[], openIndex: number, type: string): number {
  let depth = 0
  for (let i = openIndex + 1; i < children.length; i++) {
    const t = children[i]
    if (!t) continue
    if (t.type === type) {
      if (t.nesting === 1) depth += 1
      else if (t.nesting === -1) {
        if (depth === 0) return i
        depth -= 1
      } else {
        return i
      }
    }
  }
  return children.length - 1
}

function innerInline(tokens: Token[], openIndex: number, closeIndex: number): Token[] {
  const inner = tokens.slice(openIndex + 1, closeIndex)
  const inline = inner.find(t => t.type === 'inline')
  return inline?.children ?? []
}

function plainOf(c: Token): string {
  return c.type === 'softbreak' || c.type === 'hardbreak' ? '\n' : c.content
}

function inlinePlain(token: Token): string {
  if (token.children) return inlinePlainFromChildren(token.children)
  return token.content
}

function inlinePlainFromChildren(children: Token[]): string {
  return children.map(plainOf).join('')
}

function tokensToPlain(tokens: Token[], start: number, end: number): string {
  const parts: string[] = []
  for (let i = start; i < end; i++) {
    const t = tokens[i]
    if (!t) continue
    if (t.type === 'inline') parts.push(inlinePlain(t))
    else if (t.type === 'fence') parts.push(t.content)
    else if (t.type === 'text') parts.push(t.content)
  }
  return parts.join('\n')
}

function sourceLines(source: string): string[] {
  return source.split(/\r?\n/)
}

/**
 * Body of a `::name` component exactly as it was written.
 *
 * Diagram bodies (mermaid, tldraw) are not markdown: re-serialising their tokens loses blank
 * lines, indentation, and any run of indented lines markdown-it turned into a code block. Slice
 * the original lines instead so the source compiled here is byte-identical to the source the
 * renderer was handed.
 */
function componentBody(
  open: Token,
  tokens: Token[],
  start: number,
  end: number,
  lines: string[],
): string {
  const raw = rawComponentBody(open, lines)
  return (raw ?? tokensToSource(tokens, start, end)).trimEnd()
}

function rawComponentBody(open: Token, lines: string[]): string | undefined {
  if (!open.map) return undefined
  const [openLine, closeLine] = open.map
  if (openLine === undefined || closeLine === undefined) return undefined
  if (closeLine <= openLine + 1) return ''
  const prefix = /^[\s>]*/.exec(lines[openLine] ?? '')?.[0] ?? ''
  return lines
    .slice(openLine + 1, closeLine)
    .map(line => stripBodyPrefix(line, prefix))
    .join('\n')
}

/** Drop the container's own indentation or blockquote marker from one body line. */
function stripBodyPrefix(line: string, prefix: string): string {
  let i = 0
  while (i < prefix.length && i < line.length) {
    const a = line[i]!
    const b = prefix[i]!
    if (a !== b && !(isBodySpace(a) && isBodySpace(b))) break
    i += 1
  }
  return line.slice(i)
}

function isBodySpace(ch: string): boolean {
  return ch === ' ' || ch === '\t'
}

function tokensToSource(tokens: Token[], start: number, end: number): string {
  const parts: string[] = []
  for (let i = start; i < end; i++) {
    const t = tokens[i]
    if (!t) continue
    if (t.type === 'inline' || t.type === 'fence' || t.type === 'text') parts.push(t.content)
  }
  return parts.join('\n')
}

function parseFenceInfo(info: string): { lang: string; meta: Record<string, string> } {
  const trimmed = info.trim()
  const m = /^(\S+)(?:\s+(.*))?$/.exec(trimmed)
  const lang = m?.[1] ?? ''
  const rest = m?.[2] ?? ''
  return { lang, meta: parseBraceAttrs(rest) }
}

function parseBraceAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  const braced = raw.trim()
  const inner = braced.startsWith('{') && braced.endsWith('}') ? braced.slice(1, -1) : braced
  const re = /([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g
  let match: RegExpExecArray | null
  while ((match = re.exec(inner)) !== null) {
    const key = match[1]!
    out[key] = match[2] ?? match[3] ?? match[4] ?? 'true'
  }
  return out
}

function formatProps(props: Record<string, string>): string {
  const keys = Object.keys(props)
  if (keys.length === 0) return ''
  return `{${keys.map(k => `${k}="${props[k]}"`).join(' ')}}`
}

function splitMentions(
  text: string,
): Array<{ type: 'text'; text: string } | { type: 'mention'; id: number }> {
  const out: Array<{ type: 'text'; text: string } | { type: 'mention'; id: number }> = []
  let last = 0
  MENTION_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = MENTION_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) })
    out.push({ type: 'mention', id: Number(m[1]) })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) })
  return out
}

function ensureTrailingNewline(ops: DeltaOp[]): void {
  const last = ops[ops.length - 1]
  if (!last) {
    ops.push(newlineOp())
    return
  }
  if (last.insert !== '\n' && typeof last.insert === 'string' && !last.insert.endsWith('\n')) {
    ops.push(newlineOp())
  }
}
