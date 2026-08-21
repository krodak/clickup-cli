import { describe, expect, it } from 'vitest'
import { collectDiagramSources, compileCufm } from '../../../src/cufm/compile.js'

const PRETTY_TLDR = `{
  "tldrawFileFormatVersion": 1,

  "records": [

    { "id": "shape:a", "type": "geo" }
  ]
}`

function compiledSources(markdown: string): Array<{ language: string; source: string }> {
  const seen: Array<{ language: string; source: string }> = []
  compileCufm(markdown, {
    renderMermaid: source => {
      seen.push({ language: 'mermaid', source })
      return undefined
    },
    renderTldraw: source => {
      seen.push({ language: 'tldraw', source })
      return undefined
    },
  })
  return seen
}

describe('collectDiagramSources', () => {
  it('finds fenced and component diagrams with their props', () => {
    const markdown = [
      '```mermaid',
      'flowchart LR',
      '  A --> B',
      '```',
      '',
      '::tldraw{width="640"}',
      '{"records":[]}',
      '::',
      '',
    ].join('\n')
    expect(collectDiagramSources(markdown)).toEqual([
      { language: 'mermaid', source: 'flowchart LR\n  A --> B', meta: {} },
      { language: 'tldraw', source: '{"records":[]}', meta: { width: '640' } },
    ])
  })

  it.each([
    ['fenced tldraw', '```tldraw\n' + PRETTY_TLDR + '\n```\n'],
    ['tldraw component', '::tldraw{width="640"}\n' + PRETTY_TLDR + '\n::\n'],
    ['mermaid component', '::mermaid\nflowchart LR\n  A --> B\n\n  B --> C\n::\n'],
    ['nested tldraw component', '- item\n  ::tldraw\n  {\n    "records": []\n  }\n  ::\n'],
  ])('matches the source the compiler renders for a %s', (_kind, markdown) => {
    // Pre-rendering caches by these strings, so any drift here is a silent "render failed".
    expect(
      collectDiagramSources(markdown).map(d => ({ language: d.language, source: d.source })),
    ).toEqual(compiledSources(markdown))
  })
})
