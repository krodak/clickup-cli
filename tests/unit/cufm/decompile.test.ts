import { describe, expect, it } from 'vitest'
import type { DeltaOp } from '../../../src/rich-text/delta.js'

describe('splitMultilineInserts', () => {
  it('decompiles inserts that contain embedded newlines', async () => {
    const { decompileCufm, splitMultilineInserts } = await import('../../../src/cufm/decompile.js')
    const ops = [
      { insert: 'one\ntwo', attributes: { bold: true } },
      { insert: '\n' },
      { insert: 'three\n' },
    ]
    expect(splitMultilineInserts(ops)).toEqual([
      { insert: 'one', attributes: { bold: true } },
      { insert: '\n' },
      { insert: 'two', attributes: { bold: true } },
      { insert: '\n' },
      { insert: 'three' },
      { insert: '\n' },
    ])
    // Each `\n` op is its own Quill block, so they need blank-line separation to
    // survive a re-compile: a markdown soft break would collapse back to a space.
    expect(decompileCufm(ops)).toBe('**one**\n\n**two**\n\nthree\n')
  })

  it('decompiles the first synced content embed as its definition and later embeds as clones', async () => {
    const { decompileCufm } = await import('../../../src/cufm/decompile.js')
    const ref = { insert: { 'sync-block': { id: 'sync-1' } } }
    const ops = [ref, { insert: 'Below is a clone of the above block:' }, { insert: '\n' }, ref]
    expect(
      decompileCufm(ops, {
        syncBlocks: [
          {
            id: 'sync-1',
            ops: [{ insert: 'This is a synced content block' }, { insert: '\n' }],
          },
        ],
      }),
    ).toBe(`::sync-block{id="sync-1"}
This is a synced content block
::

Below is a clone of the above block:

::sync-block{id="sync-1"}
::
`)
  })
})

describe('decompileCufm block structure', () => {
  async function decompile(ops: DeltaOp[]): Promise<string> {
    const { decompileCufm } = await import('../../../src/cufm/decompile.js')
    return decompileCufm(ops)
  }

  const codeLine = (text: string, lang: string): DeltaOp[] => [
    { insert: text },
    { insert: '\n', attributes: { 'code-block': { 'code-block': lang } } },
  ]

  it('joins consecutive code-block lines into one fence', async () => {
    const ops = [...codeLine('one', 'sql'), ...codeLine('two', 'sql'), ...codeLine('three', 'sql')]
    expect(await decompile(ops)).toBe('```sql\none\ntwo\nthree\n```\n')
  })

  it('keeps separate fences apart when a plain line divides them', async () => {
    const ops = [...codeLine('a', 'sql'), { insert: '\n' }, ...codeLine('b', 'js')]
    expect(await decompile(ops)).toBe('```sql\na\n```\n\n```js\nb\n```\n')
  })

  it('keeps task mentions inline instead of breaking the sentence onto new lines', async () => {
    const ops: DeltaOp[] = [
      { insert: 'Depends on ' },
      { insert: { task_mention: { task_id: '86bbceuh3' } } },
      { insert: ' and ' },
      { insert: { task_mention: { task_id: '86bbceuhv' } } },
      { insert: '.' },
      { insert: '\n' },
    ]
    expect(await decompile(ops)).toBe('Depends on :task[86bbceuh3] and :task[86bbceuhv].\n')
  })

  it('renders a mention-only line as a block shorthand', async () => {
    const ops: DeltaOp[] = [{ insert: { task_mention: { task_id: '86x' } } }, { insert: '\n' }]
    expect(await decompile(ops)).toBe(':task[86x]\n')
  })

  it('wraps every line of one banner in a single component', async () => {
    const banner = {
      'advanced-banner': 'banner-1',
      'advanced-banner-color': 'blue',
      'advanced-banner-icon': JSON.stringify({ value: 'emoji::🧩' }),
    }
    const ops: DeltaOp[] = [
      { insert: 'first' },
      { insert: '\n', attributes: banner },
      { insert: 'second' },
      { insert: '\n', attributes: banner },
    ]
    expect(await decompile(ops)).toBe('::banner{color="blue" icon="🧩"}\nfirst\n\nsecond\n::\n')
  })

  it('numbers ordered lists and indents children past the parent marker', async () => {
    const ordered = (text: string, indent?: number): DeltaOp[] => [
      { insert: text },
      {
        insert: '\n',
        attributes: indent ? { list: { list: 'ordered' }, indent } : { list: { list: 'ordered' } },
      },
    ]
    const ops = [...ordered('one'), ...ordered('one a', 1), ...ordered('two')]
    expect(await decompile(ops)).toBe('1. one\n   1. one a\n2. two\n')
  })

  it('keeps inline formatting in table cells and folds multi-line cells', async () => {
    const cell = (content: DeltaOp[]) => ({ content, attributes: { colspan: '1', rowspan: '1' } })
    const ops: DeltaOp[] = [
      {
        insert: {
          'table-embed': {
            rows: [{ insert: { id: 'r1' } }, { insert: { id: 'r2' } }],
            columns: [
              { insert: { id: 'c1' }, attributes: { width: '100' } },
              { insert: { id: 'c2' }, attributes: { width: '200' } },
            ],
            cells: {
              // ClickUp folds the cell's trailing newline into the text insert.
              '1:1': cell([{ insert: 'Symbol\n' }]),
              '1:2': cell([{ insert: 'Definition\n' }]),
              '2:1': cell([{ insert: 'N', attributes: { code: true } }, { insert: '\n' }]),
              '2:2': cell([
                { insert: 'window', attributes: { bold: true } },
                { insert: '\n' },
                { insert: 'in days' },
              ]),
            },
          },
        },
      },
    ]
    expect(await decompile(ops)).toBe(
      [
        '::table{widths="100,200"}',
        '| Symbol | Definition |',
        '| --- | --- |',
        '| `N` | **window**<br>in days |',
        '::',
        '',
      ].join('\n'),
    )
  })

  it('emits one delimiter pair across adjacent spans that share an emphasis', async () => {
    const ops: DeltaOp[] = [
      { insert: 'SDR', attributes: { bold: true, code: true } },
      { insert: ' is the consumed value', attributes: { bold: true } },
      { insert: ':' },
      { insert: '\n' },
    ]
    // Wrapping each span on its own would emit `**`SDR`**** is ...**`.
    expect(await decompile(ops)).toBe('**`SDR` is the consumed value**:\n')
  })

  it('closes toggles around their indented children', async () => {
    const ops: DeltaOp[] = [
      { insert: 'Title' },
      { insert: '\n', attributes: { list: { list: 'toggled', 'toggle-id': 't1' } } },
      { insert: 'body' },
      { insert: '\n', attributes: { list: { list: 'none' }, indent: 1 } },
      { insert: 'after' },
      { insert: '\n' },
    ]
    expect(await decompile(ops)).toBe('::toggle{title="Title"}\nbody\n::\n\nafter\n')
  })

  it('collapses a rendered diagram back to the fence that produced it', async () => {
    const ops: DeltaOp[] = [
      { insert: { image: 'https://cdn.example/d.png' }, attributes: { width: '800' } },
      { insert: '\n' },
      { insert: 'mermaid source' },
      { insert: '\n', attributes: { list: { list: 'toggled', 'toggle-id': 't1' } } },
      { insert: 'flowchart TD' },
      {
        insert: '\n',
        attributes: {
          'code-block': { 'code-block': 'mermaid', 'in-list': 'none', 'wrapper-indent': '1' },
        },
      },
      {
        insert: '  A --> B',
      },
      {
        insert: '\n',
        attributes: {
          'code-block': { 'code-block': 'mermaid', 'in-list': 'none', 'wrapper-indent': '1' },
        },
      },
    ]
    expect(await decompile(ops)).toBe('```mermaid\nflowchart TD\n  A --> B\n```\n')
  })
})
