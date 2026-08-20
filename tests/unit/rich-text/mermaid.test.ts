import { describe, expect, it } from 'vitest'
import { inlineSvgColors, renderMermaidPng } from '../../../src/rich-text/mermaid.js'

describe('mermaid renderer', () => {
  it('inlines CSS custom properties', () => {
    const svg =
      '<svg style="color: var(--fg); fill: color-mix(in srgb, var(--fg) 50%, var(--bg))"></svg>'
    const out = inlineSvgColors(svg, { bg: '#ffffff', fg: '#000000' })
    expect(out).not.toContain('var(--fg)')
    expect(out).not.toContain('color-mix')
    expect(out).toContain('#000000')
  })

  it('renders a flowchart to a PNG', async () => {
    const { png, width, height } = await renderMermaidPng('flowchart LR\n  A --> B\n')
    expect(png.subarray(0, 8).toString('binary')).toBe('\x89PNG\r\n\x1a\n')
    expect(width).toBeGreaterThan(10)
    expect(height).toBeGreaterThan(10)
  })
})
