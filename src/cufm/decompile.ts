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

export function decompileCufm(rawOps: DeltaOp[]): string {
  const ops = splitMultilineInserts(rawOps)
  const lines: string[] = []
  let i = 0
  while (i < ops.length) {
    const op = ops[i]
    if (!op) break
    const kind = embedType(op.insert)
    if (kind === 'table_content') {
      lines.push('::toc', '::', '')
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'divider') {
      lines.push('---', '')
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'table-embed') {
      lines.push(decompileTable(op), '')
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'image') {
      const src = (op.insert as { image: string }).image
      const width = op.attributes?.width
      const widthAttr = width !== undefined ? `{width="${attrStr(width)}"}` : ''
      lines.push(`![](${src})${widthAttr}`)
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'button') {
      const button = (op.insert as { button: { title?: string; url?: string; color?: string } })
        .button
      lines.push(`::button{url="${button.url ?? ''}" color="${button.color ?? '#646464'}"}`)
      lines.push(button.title ?? 'Button')
      lines.push('::', '')
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'frame') {
      const frame = (op.insert as { frame: { src?: string } }).frame
      const height = op.attributes?.height
      const h = height !== undefined ? ` height="${attrStr(height)}"` : ''
      lines.push(`::frame{src="${frame.src ?? ''}"${h}}`, '::', '')
      i = skipFollowingNewline(ops, i)
      continue
    }
    if (kind === 'user_mention') {
      const user = (op.insert as { user_mention: { id?: number; name?: string } }).user_mention
      const name = user.name ?? String(user.id ?? '')
      lines.push(`:user[${name}]{id="${user.id ?? ''}"}`)
      i += 1
      continue
    }
    if (kind === 'task_mention') {
      const task = (op.insert as { task_mention: { task_id?: string } }).task_mention
      lines.push(`:task[${task.task_id ?? ''}]`)
      i += 1
      continue
    }
    if (kind === 'doc_mention') {
      const doc = (op.insert as { doc_mention: { viewId?: string; pageId?: string } }).doc_mention
      lines.push(`:doc{view="${doc.viewId ?? ''}" page="${doc.pageId ?? ''}"}`)
      i += 1
      continue
    }
    if (typeof op.insert !== 'string') {
      i += 1
      continue
    }

    const run = collectRun(ops, i)
    i = run.next
    lines.push(...run.lines)
  }
  return (
    lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  )
}

function skipFollowingNewline(ops: DeltaOp[], i: number): number {
  const next = ops[i + 1]
  if (next && next.insert === '\n') return i + 2
  return i + 1
}

function collectRun(ops: DeltaOp[], start: number): { lines: string[]; next: number } {
  let i = start
  const chunks: string[] = []
  let lineAttrs: Record<string, unknown> | undefined
  while (i < ops.length) {
    const op = ops[i]
    if (!op) break
    if (op.insert === '\n') {
      lineAttrs = op.attributes
      i += 1
      break
    }
    if (!isTextInsert(op.insert)) break
    chunks.push(formatInline(op.insert, op.attributes))
    i += 1
  }
  const text = chunks.join('')
  const lines = [applyLineAttrs(text, lineAttrs)]
  return { lines, next: i }
}

function formatInline(text: string, attrs?: Record<string, unknown>): string {
  if (!attrs) return text
  let out = text
  if (attrs.code) out = `\`${out}\``
  if (attrs.bold && attrs.italic) out = `***${out}***`
  else if (attrs.bold) out = `**${out}**`
  else if (attrs.italic) out = `*${out}*`
  if (attrs.strike) out = `~~${out}~~`
  if (attrs.link) out = `[${out}](${attrStr(attrs.link)})`
  if (attrs.underline) out = `[${stripWrap(out)}]{underline}`
  if (attrs['background-class'])
    out = `[${stripWrap(out)}]{highlight="${attrStr(attrs['background-class'])}"}`
  if (attrs['badge-class'])
    out = `:badge[${stripWrap(out)}]{color="${attrStr(attrs['badge-class'])}"}`
  else if (attrs['color-class'])
    out = `[${stripWrap(out)}]{color="${attrStr(attrs['color-class'])}"}`
  return out
}

function stripWrap(text: string): string {
  return text
    .replace(/^\*+|\*+$/g, '')
    .replace(/^`|`$/g, '')
    .replace(/^~~|~~$/g, '')
}

function applyLineAttrs(text: string, attrs?: Record<string, unknown>): string {
  if (!attrs) return text
  const header = attrs.header
  if (typeof header === 'number') {
    const hashes = '#'.repeat(header)
    const align = attrs.align ? ` {align="${attrStr(attrs.align)}"}` : ''
    return `${hashes} ${text}${align}`
  }
  const list = (attrs.list as { list?: string; 'toggle-id'?: string } | undefined)?.list
  const indent = Number(attrs.indent ?? 0)
  const pad = '  '.repeat(indent)
  if (list === 'toggled') {
    return `${pad}::toggle{title="${escapeAttr(text)}"}`
  }
  if (list === 'none') {
    const code = attrs['code-block'] as { 'code-block'?: string } | string | undefined
    const lang =
      typeof code === 'object' ? code['code-block'] : typeof code === 'string' ? code : undefined
    if (lang) {
      return `${pad}\`\`\`${lang}\n${text}\n\`\`\``
    }
    return `${pad}${text}`
  }
  if (list === 'bullet') return `${pad}- ${text}`
  if (list === 'ordered') return `${pad}1. ${text}`
  if (list === 'checked') return `${pad}- [x] ${text}`
  if (list === 'unchecked') return `${pad}- [ ] ${text}`
  const code = attrs['code-block'] as
    { 'code-block'?: string | boolean; 'code-block-line-numbers'?: string } | undefined
  if (code) {
    const lang = typeof code['code-block'] === 'string' ? code['code-block'] : ''
    const ln = code['code-block-line-numbers'] === 'true' ? ' {lineNumbers}' : ''
    return `\`\`\`${lang}${ln}\n${text}\n\`\`\``
  }
  if (attrs.blockquote) {
    const size = attrs['blockquote-size']
    if (size === 'large') {
      return `::quote{size="large"}\n${text}\n::`
    }
    return `> ${text}`
  }
  if (attrs['advanced-banner']) {
    const color = attrStr(attrs['advanced-banner-color']) || 'blue'
    const alert = BANNER_TO_ALERT[color]
    if (alert && !attrs['advanced-banner-icon']) {
      return `> [!${alert}]\n> ${text}`
    }
    const icon = parseBannerIcon(attrs['advanced-banner-icon'])
    const iconProp = icon ? ` icon="${icon}"` : ''
    return `::banner{color="${color}"${iconProp}}\n${text}\n::`
  }
  if (attrs.align) return `${text} {align="${attrStr(attrs.align)}"}`
  if (attrs['color-class'] || attrs['block-color']) {
    const color = attrs['color-class'] ? `color="${attrStr(attrs['color-class'])}"` : ''
    const bg = attrs['block-color'] ? ` background="${attrStr(attrs['block-color'])}"` : ''
    return `${text} {${color}${bg}}`.replace('{ ', '{')
  }
  return text
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

function decompileTable(op: DeltaOp): string {
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
      const text = cellText(cell?.content ?? [])
      cells.push(text)
    }
    lines.push(`| ${cells.join(' | ')} |`)
    if (r === 1) {
      lines.push(`| ${cells.map(() => '---').join(' | ')} |`)
    }
  }
  if (widths.length > 0) lines.push('::')
  return lines.join('\n')
}

interface TableEmbed {
  rows: Array<{ insert: { id: string } }>
  columns: Array<{ insert: { id: string }; attributes?: { width?: string } }>
  cells: Record<string, { content: DeltaOp[] }>
}

function cellText(content: DeltaOp[]): string {
  return content
    .filter(op => typeof op.insert === 'string' && op.insert !== '\n')
    .map(op => (typeof op.insert === 'string' ? op.insert : ''))
    .join('')
}

function escapeAttr(value: string): string {
  return value.replaceAll('"', '\\"')
}
