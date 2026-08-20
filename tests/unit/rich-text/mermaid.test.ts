import { describe, expect, it } from 'vitest'
import {
  MERMAID_PIXEL_RATIO,
  inlineSvgColors,
  renderMermaidPng,
} from '../../../src/rich-text/mermaid.js'

describe('mermaid renderer', () => {
  it('inlines CSS custom properties', () => {
    const svg =
      '<svg style="color: var(--fg); fill: color-mix(in srgb, var(--fg) 50%, var(--bg))"></svg>'
    const out = inlineSvgColors(svg, { bg: '#ffffff', fg: '#000000' })
    expect(out).not.toContain('var(--fg)')
    expect(out).not.toContain('color-mix')
    expect(out).toContain('#000000')
  })

  it('keeps node fills distinct from text colors', () => {
    const svg = '<rect fill="var(--_node-fill)"/><text fill="var(--_text)">A</text>'
    const out = inlineSvgColors(svg, { bg: '#ffffff', fg: '#1f2328' })
    expect(out).toContain('<rect fill="#f8f8f9"/>')
    expect(out).toContain('<text fill="#1f2328">')
  })

  it('renders a flowchart to a PNG', async () => {
    const { png, svg, width, height, pixelWidth, pixelHeight } = await renderMermaidPng(
      'flowchart LR\n  A --> B\n',
    )
    expect(png.subarray(0, 8).toString('binary')).toBe('\x89PNG\r\n\x1a\n')
    expect(svg).not.toMatch(/<rect[^>]+fill="#1f2328"/)
    expect(svg).toMatch(/<text[^>]+fill="#1f2328"/)
    expect(width).toBeGreaterThan(10)
    expect(height).toBeGreaterThan(10)
    expect(pixelWidth).toBe(width * MERMAID_PIXEL_RATIO)
    expect(pixelHeight).toBe(height * MERMAID_PIXEL_RATIO)
  })
})
