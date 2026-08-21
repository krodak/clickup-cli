import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { BADGE_COLORS, BANNER_COLORS, HIGHLIGHT_COLORS, TEXT_COLORS } from '../cufm/colors.js'
import { compileCufm } from '../cufm/compile.js'
import { generateDoctorDocument } from '../cufm/doctor-document.js'
import { decompileCufm } from '../cufm/decompile.js'
import { compileForTask } from '../cufm/publish.js'
import type { DeltaOp } from '../rich-text/delta.js'
import { stringifyMarkdownFile } from './frontmatter.js'
import { fetchTaskOps, updateSyncBlockContents } from './frontdoor.js'
import { contentHash } from './hash.js'

export interface DoctorCheck {
  id: string
  ok: boolean
  detail: string
  skipped?: boolean
}

export interface DoctorColorReport {
  channel: string
  expected: string[]
  found: string[]
  missing: string[]
}

export interface DoctorResult {
  taskId: string
  url: string
  file?: string
  deleted: boolean
  lossless: boolean
  checks: DoctorCheck[]
  colors: DoctorColorReport[]
  warnings: string[]
}

export interface DoctorOptions {
  /** List to create a new doctor task in. Ignored when `task` is given. */
  list?: string
  /** Overwrite this existing task's description instead of creating a new one. */
  task?: string
  file?: string
  deleteAfter?: boolean
  dryRun?: boolean
  sessionToken?: string
  mermaidTheme?: string
}

export async function runTaskSyncDoctor(
  config: Config,
  opts: DoctorOptions,
): Promise<DoctorResult> {
  if (!opts.task && !opts.list) {
    throw new Error('task-sync doctor requires --list <listId> or --task <taskId>')
  }
  const client = new ClickUpClient(config)
  const me = await client.getMe()
  const body = generateDoctorDocument({ userId: me.id, username: me.username })
  const colorChannelCases =
    TEXT_COLORS.length * 2 + HIGHLIGHT_COLORS.length + BADGE_COLORS.length + BANNER_COLORS.length

  if (opts.dryRun) {
    let file: string | undefined
    if (opts.file) {
      const abs = resolve(opts.file)
      await mkdir(dirname(abs), { recursive: true })
      await writeFile(abs, stringifyMarkdownFile({ title: 'cup task-sync doctor' }, body))
      file = abs
    }
    return {
      taskId: opts.task ?? '(dry-run)',
      url: '',
      file,
      deleted: false,
      lossless: false,
      checks: [
        {
          id: 'dry-run',
          ok: true,
          detail: opts.task
            ? `Would overwrite task ${opts.task} (${String(colorChannelCases)} supported color/channel combinations)`
            : `Would create a doctor task in list ${String(opts.list)} (${String(colorChannelCases)} supported color/channel combinations)`,
        },
      ],
      colors: [],
      warnings: [],
    }
  }

  const created = opts.task
    ? await client.getTask(opts.task)
    : await client.createTask(String(opts.list), {
        name: `cup task-sync doctor ${new Date().toISOString().slice(0, 19)}`,
      })
  const previous = opts.task ? await fetchTaskOps(config, created.id, opts.sessionToken) : undefined
  const previousSyncBlock = previous?.syncBlocks[0]
  const withTask = generateDoctorDocument({
    userId: me.id,
    username: me.username,
    taskId: created.id,
    ...(previousSyncBlock
      ? {
          syncedContent: {
            id: previousSyncBlock.id,
            body: decompileCufm(previousSyncBlock.ops).trimEnd(),
          },
        }
      : {}),
  })

  const compiled = await compileForTask({
    markdown: withTask,
    client,
    taskId: created.id,
    baseDir: process.cwd(),
    media: {},
    mermaidTheme: opts.mermaidTheme,
  })
  await updateSyncBlockContents(config, compiled.syncBlocks, opts.sessionToken)
  await client.updateTask(created.id, { description: { ops: compiled.ops } })
  const task = await client.getTask(created.id)
  const md = task.markdown_description ?? task.description ?? ''
  const stored = await fetchTaskOps(config, created.id, opts.sessionToken)
  const ops = stored?.ops
  const checks = auditMarkdown(md)
  checks.push(...auditLocalRoundTrip(withTask))
  if (ops) {
    checks.push(...auditOps(ops, compiled.ops))
    // The same structural assertions against what ClickUp actually stored, so a
    // server-side normalisation shows up as a different failure than a local bug.
    checks.push(...auditStructure(decompileCufm(ops), 'stored'))
  } else {
    checks.push({
      id: 'quill-roundtrip',
      ok: true,
      skipped: true,
      detail: 'Set CU_SESSION_TOKEN (or --session-token) to verify stored Quill color tokens',
    })
  }
  const colors = ops ? auditColors(ops) : []

  let file: string | undefined
  if (opts.file) {
    const abs = resolve(opts.file)
    await mkdir(dirname(abs), { recursive: true })
    await writeFile(
      abs,
      stringifyMarkdownFile(
        {
          clickup_id: created.id,
          clickup_url: task.url,
          title: task.name,
          list_id: opts.list ?? task.list.id,
          last_sync_at: new Date().toISOString(),
          last_remote_date_updated: task.date_updated,
          content_hash: contentHash(withTask, []),
        },
        withTask,
      ),
    )
    file = abs
  }

  let deleted = false
  if (opts.deleteAfter) {
    await client.deleteTask(created.id)
    deleted = true
  }

  return {
    taskId: created.id,
    url: task.url,
    file,
    deleted,
    lossless: ops !== undefined,
    checks,
    colors,
    warnings: compiled.warnings,
  }
}

function auditMarkdown(md: string): DoctorCheck[] {
  return [
    {
      id: 'tight-h1',
      ok: /^# Tight H1\nThis paragraph must sit directly under the H1/.test(md),
      detail: 'H1 is immediately followed by its paragraph in markdown_description',
    },
    {
      id: 'table',
      ok: md.includes('| Narrow |') || md.includes('| Auto A |') || /\|.+\|/.test(md),
      detail: 'GFM/native table survived',
    },
    {
      id: 'link',
      ok: md.includes('https://example.com'),
      detail: 'Link URL present',
    },
    {
      id: 'task-list',
      ok: md.includes('- [ ]') || md.includes('- [x]'),
      detail: 'Task list markers present',
    },
    {
      id: 'code-fence',
      ok: md.includes('```'),
      detail: 'Fenced code present',
    },
    {
      id: 'divider',
      ok: md.includes('* * *') || md.includes('---'),
      detail: 'Horizontal rule present',
    },
    {
      id: 'mermaid-or-image',
      ok: /clickup-attachments|\.png|```mermaid/.test(md),
      detail: 'Mermaid rendered as an image or kept as a fence',
    },
    {
      id: 'tldraw-source',
      ok: /tldraw source|tldrawFileFormatVersion|```tldraw/i.test(md),
      detail: 'tldraw source toggle or fallback fence present',
    },
    {
      id: 'toggle',
      ok: /Simple toggle|mermaid source|tldraw source/i.test(md),
      detail: 'Toggle title present (markdown exports toggles as lists)',
    },
    {
      id: 'doc-complete',
      ok: md.includes('If this paragraph is visible'),
      detail: 'Document compiled through to the End section',
    },
  ]
}

function auditOps(stored: DeltaOp[], sent: DeltaOp[]): DoctorCheck[] {
  const sentTypes = embedTypes(sent)
  const gotTypes = embedTypes(stored)
  const missing = [...sentTypes].filter(t => !gotTypes.has(t))
  return [
    {
      id: 'embed-types',
      ok: missing.length === 0,
      detail:
        missing.length === 0
          ? `Stored embeds: ${[...gotTypes].sort().join(', ')}`
          : `Missing embeds after round-trip: ${missing.join(', ')}`,
    },
  ]
}

/** One entry per fenced code block, so a shredded block shows up as many 1-line entries. */
function fences(md: string): Array<{ lang: string; lines: string[] }> {
  const out: Array<{ lang: string; lines: string[] }> = []
  let current: { lang: string; lines: string[] } | undefined
  for (const line of md.split('\n')) {
    const open = /^\s*```(\S*)/.exec(line)
    if (open) {
      if (current) {
        out.push(current)
        current = undefined
      } else {
        current = { lang: open[1] ?? '', lines: [] }
      }
      continue
    }
    current?.lines.push(line)
  }
  return out
}

/** Bodies of each `::name` … `::` block, so a component's contents can be asserted. */
function componentBodies(md: string, name: string): string[] {
  const bodies: string[] = []
  const lines = md.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!new RegExp(`^ *::${name}\\b`).test(lines[i] ?? '')) continue
    const body: string[] = []
    for (let j = i + 1; j < lines.length && !/^ *::$/.test(lines[j] ?? ''); j++) {
      body.push(lines[j] ?? '')
    }
    bodies.push(body.join('\n'))
  }
  return bodies
}

/**
 * Structural properties the doctor document is written to exercise. Each one
 * corresponds to a way a decompile used to lose or mangle content, and each is
 * checked both locally and against what ClickUp actually stored.
 */
const STRUCTURE_ASSERTIONS: Array<{
  id: string
  detail: string
  test: (md: string) => boolean
}> = [
  {
    id: 'code-block-whole',
    detail: 'Multi-line code block returns as one fence, not one fence per line',
    // Pinned to the marker line so that shredding this block cannot be masked by
    // some other multi-line fence elsewhere in the document.
    test: md =>
      fences(md).some(
        fence =>
          fence.lines.length >= 3 &&
          fence.lines.some(line => line.includes('three body lines, one block')),
      ),
  },
  {
    id: 'code-fences-balanced',
    detail: 'Every code fence is closed',
    test: md => (md.match(/^\s*```/gm) ?? []).length % 2 === 0,
  },
  {
    id: 'components-balanced',
    detail: 'Every ::component that opens also closes',
    test: md =>
      (md.match(/^ *:{2,}[a-z][a-z-]*/gm) ?? []).length === (md.match(/^ *:{2,}$/gm) ?? []).length,
  },
  {
    id: 'mentions-inline',
    detail: 'Mentions stay inside their sentence instead of breaking onto their own lines',
    test: md =>
      md
        .split('\n')
        .some(
          line =>
            line.includes('Mentions stay inline:') &&
            line.includes('this trailing text must stay on the same line'),
        ),
  },
  {
    id: 'adjacent-emphasis',
    detail: 'Adjacent spans sharing an emphasis emit one delimiter pair',
    test: md => md.includes('**`SDR` is the consumed value**'),
  },
  {
    id: 'banner-grouped',
    detail: 'Every line of a multi-paragraph banner stays inside one banner',
    test: md =>
      componentBodies(md, 'banner').some(
        body =>
          body.includes('Multi-paragraph banner') &&
          body.includes('Second paragraph must stay inside the same banner'),
      ),
  },
  {
    id: 'quote-grouped',
    detail: 'Every line of a multi-paragraph pull quote stays inside one quote',
    test: md =>
      componentBodies(md, 'quote').some(
        body =>
          body.includes('This is a pull quote') &&
          body.includes('Second pull-quote paragraph stays in the same quote block'),
      ),
  },
  {
    id: 'ordered-numbering',
    detail: 'Ordered lists count up instead of repeating 1.',
    test: md =>
      /^1\. Ordered 1$/m.test(md) && /^2\. Ordered 2$/m.test(md) && /^3\. Ordered 3/m.test(md),
  },
  {
    id: 'ordered-nesting',
    detail: 'Nested ordered items indent past the parent marker',
    test: md => /^ {3}1\. Ordered 1\.a$/m.test(md) && /^ {3}2\. Ordered 1\.b$/m.test(md),
  },
  {
    id: 'table-cell-marks',
    detail: 'Inline formatting survives inside table cells',
    test: md => /^\|.*`code`.*\*italic\*.*\|$/m.test(md),
  },
  {
    id: 'columns-kept',
    detail: 'Column layout is rebuilt rather than flattened to paragraphs',
    test: md => md.includes('::columns') && md.includes(':::column'),
  },
  {
    id: 'diagram-fence',
    detail: 'Rendered diagram collapses to one source fence with no leftover source toggle',
    test: md =>
      !/mermaid source|tldraw source/i.test(md) &&
      fences(md).filter(f => f.lang === 'mermaid').length === 1 &&
      (fences(md).find(f => f.lang === 'mermaid')?.lines.length ?? 0) >= 3,
  },
]

export function auditStructure(md: string, prefix: string): DoctorCheck[] {
  return STRUCTURE_ASSERTIONS.map(a => ({
    id: `${prefix}:${a.id}`,
    ok: a.test(md),
    detail: a.detail,
  }))
}

/**
 * Compile and decompile the doctor document without touching the network, so a
 * regression in the CUFM converters is reported even when ClickUp is healthy
 * (or when there is no session token to read the stored document back).
 */
export function auditLocalRoundTrip(source: string): DoctorCheck[] {
  const once = decompileCufm(compileCufm(source).ops)
  const twice = decompileCufm(compileCufm(once).ops)
  return [
    ...auditStructure(once, 'local'),
    {
      id: 'local:fixed-point',
      ok: once === twice,
      detail: 'A second pull produces no further changes, so sync does not drift',
    },
  ]
}

function auditColors(ops: DeltaOp[]): DoctorColorReport[] {
  const found = {
    text: collectAttr(ops, 'color-class'),
    highlight: collectAttr(ops, 'background-class'),
    badge: collectAttr(ops, 'badge-class'),
    banner: collectAttr(ops, 'advanced-banner-color'),
    block: collectAttr(ops, 'block-color'),
  }
  return [
    report('text', TEXT_COLORS, found.text),
    report('highlight', HIGHLIGHT_COLORS, found.highlight),
    report('badge', BADGE_COLORS, found.badge),
    report('banner', BANNER_COLORS, found.banner),
    report('block', TEXT_COLORS, found.block),
  ]
}

function report(channel: string, expected: string[], found: Set<string>): DoctorColorReport {
  const missing = expected.filter(c => !found.has(c))
  return { channel, expected: [...expected], found: [...found].sort(), missing }
}

function collectAttr(ops: DeltaOp[], key: string): Set<string> {
  const out = new Set<string>()
  walkOps(ops, op => {
    const value = op.attributes?.[key]
    if (typeof value === 'string') out.add(value)
  })
  return out
}

function embedTypes(ops: DeltaOp[]): Set<string> {
  const out = new Set<string>()
  walkOps(ops, op => {
    if (typeof op.insert === 'object' && op.insert !== null) {
      const key = Object.keys(op.insert)[0]
      if (key) out.add(key)
    }
  })
  return out
}

function walkOps(ops: DeltaOp[], visit: (op: DeltaOp) => void): void {
  for (const op of ops) {
    visit(op)
    if (typeof op.insert !== 'object' || op.insert === null) continue
    const table = (
      op.insert as { 'table-embed'?: { cells?: Record<string, { content?: DeltaOp[] }> } }
    )['table-embed']
    if (table?.cells) {
      for (const cell of Object.values(table.cells)) {
        if (cell.content) walkOps(cell.content, visit)
      }
    }
  }
}

export function formatDoctorReport(result: DoctorResult): string {
  const lines: string[] = []
  lines.push(`Doctor task ${result.taskId}${result.deleted ? ' (deleted)' : ''}`)
  if (result.url) lines.push(result.url)
  if (result.file) lines.push(`local file: ${result.file}`)
  lines.push('')
  lines.push('Checks:')
  for (const c of result.checks) {
    const mark = c.skipped ? '–' : c.ok ? '✓' : '✗'
    lines.push(`  ${mark} ${c.id}: ${c.detail}`)
  }
  if (result.colors.length > 0) {
    lines.push('')
    lines.push('Color tokens stored in Quill:')
    for (const row of result.colors) {
      const mark = row.missing.length === 0 ? '✓' : '✗'
      lines.push(
        `  ${mark} ${row.channel}: ${row.found.length}/${row.expected.length} (missing: ${row.missing.join(', ') || 'none'})`,
      )
    }
  }
  if (result.warnings.length > 0) {
    lines.push('')
    lines.push('Compile warnings:')
    for (const w of result.warnings) lines.push(`  ${w}`)
  }
  const failed = result.checks.filter(c => !c.ok && !c.skipped)
  if (failed.length > 0) {
    lines.push('')
    lines.push(`${failed.length} check(s) failed. Inspect the task in the ClickUp UI.`)
  }
  return lines.join('\n')
}
