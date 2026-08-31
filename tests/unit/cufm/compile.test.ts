import { describe, expect, it } from 'vitest'
import { compileCufm } from '../../../src/cufm/compile.js'
import { sequentialIdFactory } from '../../../src/cufm/ids.js'
import { embedType } from '../../../src/rich-text/delta.js'
import type { DeltaOp } from '../../../src/rich-text/delta.js'

function compile(src: string) {
  return compileCufm(src, { ids: sequentialIdFactory() })
}

function newlines(ops: DeltaOp[]): DeltaOp[] {
  return ops.filter(op => op.insert === '\n')
}

describe('compileCufm', () => {
  it('emits a tight heading with no extra blank ops around it', () => {
    const { ops } = compile('# Heading One\nParagraph right after heading.\n')
    expect(ops[0]).toEqual({ insert: 'Heading One' })
    expect(ops[1]?.insert).toBe('\n')
    expect(ops[1]?.attributes).toMatchObject({ header: 1 })
    expect(ops[2]).toEqual({ insert: 'Paragraph right after heading.' })
    expect(ops[3]?.insert).toBe('\n')
    expect(ops[3]?.attributes).toBeUndefined()
  })

  it('compiles inline marks', () => {
    const { ops } = compile('**bold** *italic* ~~strike~~ `code` [link](https://example.com)\n')
    const texts = ops.filter(op => typeof op.insert === 'string' && op.insert !== '\n')
    expect(texts).toEqual(
      expect.arrayContaining([
        { insert: 'bold', attributes: { bold: true } },
        { insert: 'italic', attributes: { italic: true } },
        { insert: 'strike', attributes: { strike: true } },
        { insert: 'code', attributes: { code: true } },
        { insert: 'link', attributes: { link: 'https://example.com' } },
      ]),
    )
  })

  it('compiles highlight, badge, underline, and heading align', () => {
    const { ops } = compile(`# Title {align="center"}
[Red]{highlight="red"} :badge[Blue]{color="blue"} [u]{underline}
`)
    expect(ops[1]?.attributes).toMatchObject({ header: 1, align: 'center' })
    expect(ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          insert: 'Red',
          attributes: expect.objectContaining({ 'background-class': 'red' }),
        }),
        expect.objectContaining({
          insert: 'Blue',
          attributes: expect.objectContaining({ 'badge-class': 'blue' }),
        }),
        expect.objectContaining({
          insert: 'u',
          attributes: expect.objectContaining({ underline: true }),
        }),
      ]),
    )
  })

  it('lifts block backgrounds from inline spans onto the paragraph newline', () => {
    const { ops } = compile('[green]{color="green" background="green"}\n')
    expect(ops[0]).toEqual({ insert: 'green', attributes: { 'color-class': 'green' } })
    expect(ops[1]).toEqual({ insert: '\n', attributes: { 'block-color': 'green' } })
  })

  it('compiles a toggle with body marked list none', () => {
    const { ops } = compile(`::toggle{title="mermaid source"}
flowchart body
::
`)
    const nls = newlines(ops)
    expect(nls[0]?.attributes).toMatchObject({
      list: { list: 'toggled', 'toggle-id': 'list-0001' },
    })
    expect(nls[1]?.attributes).toMatchObject({
      list: { list: 'none' },
      indent: 1,
    })
  })

  it('compiles synced content and its clones to the same block embed', () => {
    const { ops, syncBlocks, warnings } = compile(`::sync-block{id="block-uuid"}
This is a synced content block
::

Below is a clone of the above block:

::sync-block{id="block-uuid"}
::
`)
    expect(warnings).toEqual([])
    expect(syncBlocks).toEqual([
      {
        id: 'block-uuid',
        ops: [{ insert: 'This is a synced content block' }, { insert: '\n' }],
      },
    ])
    expect(ops.filter(op => embedType(op.insert) === 'sync-block')).toEqual([
      { insert: { 'sync-block': { id: 'block-uuid' } } },
      { insert: { 'sync-block': { id: 'block-uuid' } } },
    ])
    const firstEmbed = ops.findIndex(op => embedType(op.insert) === 'sync-block')
    expect(ops[firstEmbed + 1]).toEqual({ insert: 'Below is a clone of the above block:' })
  })

  it('warns instead of emitting a synced content block without an id', () => {
    const { ops, warnings } = compile(`::sync-block
Content
::
`)
    expect(ops).toEqual([{ insert: '\n' }])
    expect(warnings).toEqual(['::sync-block requires an id'])
  })

  it('keeps multiline fenced code as one indented native block inside a toggle', () => {
    const { ops } = compile(`::toggle{title="Details"}
\`\`\`json
{"one": 1}
{"two": 2}
\`\`\`
::
`)
    const bodyLines = newlines(ops).slice(1)
    expect(bodyLines).toHaveLength(2)
    for (const line of bodyLines) {
      expect(line.attributes).toEqual({
        'code-block': {
          'code-block': 'json',
          'in-list': 'none',
          'wrapper-indent': '1',
        },
      })
    }
  })

  it('compiles GFM tables as table-embed with estimated widths', () => {
    const { ops } = compile(`| A | Longer column |
| --- | --- |
| 1 | 22 |
`)
    const table = ops.find(op => embedType(op.insert) === 'table-embed')
    expect(table).toBeTruthy()
    const embed = (
      table!.insert as {
        'table-embed': {
          columns: Array<{ attributes?: { width?: string } }>
          cells: Record<string, { content: DeltaOp[] }>
        }
      }
    )['table-embed']
    expect(embed.columns).toHaveLength(2)
    expect(embed.columns[0]?.attributes?.width).toBeDefined()
    expect(embed.cells['1:1']?.content[0]).toEqual({ insert: 'A' })
  })

  it('preserves inline formatting inside table cells', () => {
    const { ops } = compile(
      '| A | B | C |\n| --- | --- | --- |\n| `code` | **bold** | ~~strike~~ |\n',
    )
    const table = ops.find(op => embedType(op.insert) === 'table-embed')
    const embed = (
      table!.insert as {
        'table-embed': { cells: Record<string, { content: DeltaOp[] }> }
      }
    )['table-embed']
    expect(embed.cells['2:1']?.content[0]).toEqual({ insert: 'code', attributes: { code: true } })
    expect(embed.cells['2:2']?.content[0]).toEqual({ insert: 'bold', attributes: { bold: true } })
    expect(embed.cells['2:3']?.content[0]).toEqual({
      insert: 'strike',
      attributes: { strike: true },
    })
  })

  it('does not append blank paragraph ops after native block embeds', () => {
    const { ops } = compile('::toc\n::\n\n---\n\n| A |\n| --- |\n| B |\n\n# Next\n')
    for (const kind of ['table_content', 'divider', 'table-embed']) {
      const index = ops.findIndex(op => embedType(op.insert) === kind)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(ops[index + 1]?.insert).not.toBe('\n')
    }
  })

  it('applies explicit table widths from ::table', () => {
    const { ops } = compile(`::table{widths="120,360"}
| A | B |
| --- | --- |
| 1 | 2 |
::
`)
    const table = ops.find(op => embedType(op.insert) === 'table-embed')
    const embed = (
      table!.insert as { 'table-embed': { columns: Array<{ attributes?: { width?: string } }> } }
    )['table-embed']
    expect(embed.columns.map(c => c.attributes?.width)).toEqual(['120', '360'])
  })

  it('compiles mermaid fences to image + toggle when a renderer is provided', () => {
    const { ops } = compileCufm('```mermaid\nflowchart LR\n  A --> B\n```\n', {
      ids: sequentialIdFactory(),
      renderMermaid: () => ({ url: 'https://example.com/cup-abc.png', width: 640 }),
    })
    expect(ops[0]).toMatchObject({ insert: { image: 'https://example.com/cup-abc.png' } })
    expect(ops[0]?.attributes).toMatchObject({ width: '640' })
    expect(ops.some(op => op.insert === 'mermaid source')).toBe(true)
    const toggle = newlines(ops).find(
      op => (op.attributes?.list as { list?: string } | undefined)?.list === 'toggled',
    )
    expect(toggle).toBeTruthy()
    const body = newlines(ops).find(op => op.attributes?.['code-block'])
    expect(body?.attributes).toMatchObject({
      'code-block': {
        'code-block': 'mermaid',
        'in-list': 'none',
        'wrapper-indent': '1',
      },
    })
    expect(ops.some(op => op.insert === 'flowchart LR')).toBe(true)
  })

  it('keeps the complete Mermaid source in one indented native code block', () => {
    const { ops } = compileCufm('```mermaid\nflowchart LR\n  A --> B\n```\n', {
      ids: sequentialIdFactory(),
      renderMermaid: () => ({ url: 'https://example.com/cup-abc.png', width: 640 }),
    })
    const sourceLines = newlines(ops).filter(op => op.attributes?.['code-block'])
    expect(sourceLines).toHaveLength(2)
    for (const line of sourceLines) {
      expect(line.attributes).toEqual({
        'code-block': {
          'code-block': 'mermaid',
          'in-list': 'none',
          'wrapper-indent': '1',
        },
      })
    }
  })

  it.each([
    ['fence', '```tldraw\n{"tldrawFileFormatVersion":1,"records":[]}\n```\n'],
    ['component', '::tldraw{width="480"}\n{"tldrawFileFormatVersion":1,"records":[]}\n::\n'],
  ])('compiles a tldraw %s to an image and source toggle', (_kind, source) => {
    const { ops } = compileCufm(source, {
      ids: sequentialIdFactory(),
      renderTldraw: () => ({
        url: 'https://example.com/cup-tldraw.png',
        width: 640,
        naturalWidth: 1280,
        naturalHeight: 720,
      }),
    })
    expect(ops[0]).toMatchObject({ insert: { image: 'https://example.com/cup-tldraw.png' } })
    expect(ops[0]?.attributes).toMatchObject({
      width: source.startsWith('::') ? '480' : '640',
      'data-natural-width': '1280',
      'data-natural-height': '720',
    })
    expect(ops.some(op => op.insert === 'tldraw source')).toBe(true)
    const sourceLines = newlines(ops).filter(op => op.attributes?.['code-block'])
    expect(sourceLines).toHaveLength(1)
    expect(sourceLines[0]?.attributes).toEqual({
      'code-block': {
        'code-block': 'tldraw',
        'in-list': 'none',
        'wrapper-indent': '1',
      },
    })
    expect(ops.some(op => op.insert === '{"tldrawFileFormatVersion":1,"records":[]}')).toBe(true)
  })

  it('keeps tldraw source when no renderer is configured', () => {
    const { ops, warnings } = compile('```tldraw\n{"records":[]}\n```\n')
    expect(ops.some(op => embedType(op.insert) === 'image')).toBe(false)
    expect(ops.some(op => op.insert === 'tldraw source')).toBe(true)
    expect(warnings).toEqual([
      'tldraw fence compiled without renderer; emitting source toggle only',
    ])
  })

  it('preserves multiline JSON in a tldraw component', () => {
    const json = `{
  "tldrawFileFormatVersion": 1,
  "records": []
}`
    let renderedSource = ''
    const { ops } = compileCufm(
      `::tldraw
${json}
::
`,
      {
        ids: sequentialIdFactory(),
        renderTldraw: source => {
          renderedSource = source
          return { url: 'https://example.com/tldraw.png' }
        },
      },
    )
    expect(renderedSource).toBe(json)
    const sourceLines = newlines(ops).filter(op => op.attributes?.['code-block'])
    expect(sourceLines).toHaveLength(4)
  })

  it('keeps blank lines and indentation in a tldraw component body', () => {
    const json = `{
  "tldrawFileFormatVersion": 1,

  "records": [

    { "id": "shape:a", "type": "geo" }
  ]
}`
    let renderedSource = ''
    const { warnings } = compileCufm(`::tldraw{width="480"}\n${json}\n::\n`, {
      ids: sequentialIdFactory(),
      renderTldraw: source => {
        renderedSource = source
        return { url: 'https://example.com/tldraw.png' }
      },
    })
    expect(renderedSource).toBe(json)
    expect(warnings).toEqual([])
  })

  it('keeps a mermaid component body verbatim across blank lines', () => {
    const diagram = `flowchart LR
  A --> B

  B --> C`
    let renderedSource = ''
    compileCufm(`::mermaid\n${diagram}\n::\n`, {
      ids: sequentialIdFactory(),
      renderMermaid: source => {
        renderedSource = source
        return { url: 'https://example.com/mermaid.png' }
      },
    })
    expect(renderedSource).toBe(diagram)
  })

  it('strips the container indentation from a nested diagram body', () => {
    let renderedSource = ''
    compileCufm('- item\n  ::tldraw\n  {\n    "records": []\n  }\n  ::\n', {
      ids: sequentialIdFactory(),
      renderTldraw: source => {
        renderedSource = source
        return { url: 'https://example.com/tldraw.png' }
      },
    })
    expect(renderedSource).toBe('{\n  "records": []\n}')
  })

  it('applies code-block attributes to every line of a multiline fence', () => {
    const { ops } = compile('```text\none\ntwo\n```\n')
    const codeLines = newlines(ops).filter(op => op.attributes?.['code-block'])
    expect(codeLines).toHaveLength(2)
  })

  it('separates adjacent fences so ClickUp keeps their languages and line numbers distinct', () => {
    const { ops } = compile(
      '```json {lineNumbers}\n{"ok": true}\n```\n\n```javascript\nconsole.log("ok")\n```\n',
    )
    const codeLines = newlines(ops).filter(op => op.attributes?.['code-block'])
    expect(codeLines[0]?.attributes?.['code-block']).toEqual({
      'code-block': 'json',
      'code-block-line-numbers': 'true',
    })
    expect(codeLines[1]?.attributes?.['code-block']).toEqual({ 'code-block': 'javascript' })
    const firstCodeLine = ops.indexOf(codeLines[0]!)
    expect(ops[firstCodeLine + 1]).toEqual({ insert: '\n' })
  })

  it('embeds images with width from attributes', () => {
    const { ops } = compile('![x](https://cdn.example/a.png){width="240"}\n')
    const img = ops.find(op => embedType(op.insert) === 'image')
    expect(img?.insert).toEqual({ image: 'https://cdn.example/a.png' })
    expect(img?.attributes).toMatchObject({ width: '240' })
  })

  it('compiles task lists', () => {
    const { ops } = compile('- [ ] open\n- [x] done\n')
    const kinds = newlines(ops).map(
      op => (op.attributes?.list as { list?: string } | undefined)?.list,
    )
    expect(kinds).toContain('unchecked')
    expect(kinds).toContain('checked')
    expect(ops.filter(op => typeof op.insert === 'string' && op.insert !== '\n')).toEqual([
      { insert: 'open' },
      { insert: 'done' },
    ])
  })

  it('compiles GitHub alerts to banners', () => {
    const { ops } = compile('> [!NOTE]\n> GitHub alert\n')
    const nl = newlines(ops).find(op => op.attributes?.['advanced-banner'])
    expect(nl?.attributes).toMatchObject({ 'advanced-banner-color': 'blue' })
    expect(ops[0]).toEqual({ insert: 'GitHub alert' })
  })

  it('compiles ::banner and ::toc', () => {
    const { ops } = compile('::toc\n::\n\n::banner{color="pink-strong"}\nhi\n::\n')
    expect(ops.some(op => embedType(op.insert) === 'table_content')).toBe(true)
    const banner = newlines(ops).find(
      op => op.attributes?.['advanced-banner-color'] === 'pink-strong',
    )
    expect(banner).toBeTruthy()
  })

  it('warns on unknown components without failing', () => {
    const { ops, warnings } = compile('::nope{x="1"}\nbody\n::\n')
    expect(warnings.some(w => w.includes('::nope'))).toBe(true)
    expect(
      ops.some(
        op =>
          (op.attributes?.['code-block'] as { 'code-block'?: string } | undefined)?.[
            'code-block'
          ] === 'cufm',
      ),
    ).toBe(true)
  })

  it('compiles <@id> mentions', () => {
    const { ops } = compile('see <@2685610> please\n')
    expect(ops.filter(op => embedType(op.insert) === 'user_mention')).toHaveLength(1)
  })

  it('compiles a mention-only line as a task mention embed', () => {
    const { ops } = compile(':task[86bbhau05]\n')
    expect(ops).toEqual([{ insert: { task_mention: { task_id: '86bbhau05' } } }, { insert: '\n' }])
  })

  it('compiles standalone user, doc, and badge shorthands', () => {
    const { ops } = compile(
      ':user[Colin]{id="2685610"}\n\n:doc{view="26aqt-259" page="26aqt-84"}\n\n:badge[Red]{color="red"}\n',
    )
    expect(ops.find(op => embedType(op.insert) === 'user_mention')).toEqual({
      insert: { user_mention: { id: 2685610, name: 'Colin', notify: true } },
    })
    expect(ops.find(op => embedType(op.insert) === 'doc_mention')?.insert).toMatchObject({
      doc_mention: { viewId: '26aqt-259', pageId: '26aqt-84' },
    })
    expect(ops).toContainEqual({ insert: 'Red', attributes: { 'badge-class': 'red' } })
  })

  it('compiles a list item that is only a task mention', () => {
    const { ops } = compile('- :task[86x]\n')
    expect(ops.filter(op => embedType(op.insert) === 'task_mention')).toEqual([
      { insert: { task_mention: { task_id: '86x' } } },
    ])
    expect(newlines(ops)[0]?.attributes).toMatchObject({ list: { list: 'bullet' } })
  })
})
