import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compileCufm } from '../../../src/cufm/compile.js'
import { decompileCufm } from '../../../src/cufm/decompile.js'
import type { DeltaOp } from '../../../src/rich-text/delta.js'

/**
 * A delta captured from a real ClickUp task, so it exercises the attribute
 * shapes ClickUp actually returns rather than the ones the compiler emits.
 */
function tortureOps(): DeltaOp[] {
  const path = fileURLToPath(new URL('../../fixtures/cufm/torture.ops.json', import.meta.url))
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
  return (Array.isArray(raw) ? raw : (raw as { ops: DeltaOp[] }).ops) as DeltaOp[]
}

function pull(ops: DeltaOp[]): string {
  return decompileCufm(ops)
}

function push(markdown: string): DeltaOp[] {
  return compileCufm(markdown).ops
}

describe('CUFM round trip', () => {
  it('reaches a fixed point, so repeated pulls stop rewriting the file', () => {
    const first = pull(tortureOps())
    const second = pull(push(first))
    const third = pull(push(second))
    expect(third).toBe(second)
  })

  it('does not explode a multi-line code block into one fence per line', () => {
    const markdown = pull(tortureOps())
    // The old decompiler emitted a complete fence per code line, which made
    // diagram sources unrecoverable on the next push.
    expect(markdown).not.toMatch(/^```[a-z]*\n[^\n]*\n```\n```/m)
    const fences = markdown.match(/^```/gm) ?? []
    expect(fences.length % 2).toBe(0)
  })

  it('closes every block component it opens', () => {
    const markdown = pull(tortureOps())
    const opens = markdown.match(/^ *::[a-z][a-z-]*\{?/gm) ?? []
    const closes = markdown.match(/^ *::$/gm) ?? []
    expect(closes.length).toBe(opens.length)
  })

  // The skill reference is the contract an authoring agent follows, so a broken
  // example there is a broken description in ClickUp.
  it.each([
    ['skill reference', '../../../skills/clickup-cli/references/cufm.md'],
    ['docs', '../../../docs/cufm.md'],
  ])('round-trips every CUFM example shipped in the %s', (_name, relative) => {
    const text = readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')
    const examples = [...text.matchAll(/^`{3,4}mdc\n([\s\S]*?)^`{3,4}$/gm)].map(m => m[1] ?? '')
    expect(examples.length).toBeGreaterThan(0)
    for (const example of examples) {
      const once = pull(push(example))
      expect(pull(push(once)), `unstable example: ${example.split('\n')[0]}`).toBe(once)
    }
  })

  it('rebuilds a column layout from the layout ids on each line', () => {
    const source = [
      '::columns',
      '  :::column{width="0.5"}',
      '  Left',
      '  :::',
      '  :::column{width="0.5"}',
      '  Right',
      '  :::',
      '::',
      '',
    ].join('\n')
    expect(pull(push(source))).toBe(source)
  })

  it('survives a push/pull cycle for a document of banners, tables and diagrams', () => {
    const source = [
      '::banner{color="blue" icon="🧩"}',
      'Depends on :task[86bbceuh3] (OPA-2) and :task[86bbceuhv] (OPA-4A).',
      '',
      'Second line of the same banner.',
      '::',
      '',
      '```mermaid',
      'flowchart TD',
      '    A["one"] --> B["two"]',
      '```',
      '',
      '# Definitions',
      '',
      '::table{widths="144,708"}',
      '| Symbol | Definition |',
      '| --- | --- |',
      '| `N` | **Gross** pick visits, *not* units |',
      '::',
      '',
      '1. First',
      '2. Second',
      '   1. Nested',
      '3. Third',
      '',
      '*(A fully italic line mentioning `D_max` inline.)*',
      '',
    ].join('\n')
    expect(pull(push(source))).toBe(source)
  })
})
