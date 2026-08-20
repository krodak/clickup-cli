import { describe, expect, it } from 'vitest'
import { colorTokens } from '../../../src/cufm/colors.js'
import { compileCufm } from '../../../src/cufm/compile.js'
import { generateDoctorDocument } from '../../../src/cufm/doctor-document.js'
import { embedType } from '../../../src/rich-text/delta.js'

describe('doctor document', () => {
  const doc = generateDoctorDocument({ userId: 1, username: 'Colin', taskId: 'abc' })

  it('covers every catalog color in all channels', () => {
    for (const token of colorTokens()) {
      expect(doc).toContain(`[${token}]{color="${token}"}`)
      expect(doc).toContain(`[${token}]{highlight="${token}"}`)
      expect(doc).toContain(`:badge[${token}]{color="${token}"}`)
      expect(doc).toContain(`::banner{color="${token}"}`)
      expect(doc).toContain(`background="${token}"`)
    }
  })

  it('covers structural CUFM features', () => {
    expect(doc).toContain('# Tight H1')
    expect(doc).toContain('::toc')
    expect(doc).toContain('::toggle{title="Nested parent"}')
    expect(doc).toContain('::columns')
    expect(doc).toContain('::table{widths="120,240,360"}')
    expect(doc).toContain('```mermaid')
    expect(doc).toContain('::quote{size="large"}')
    expect(doc).toContain('::button')
    expect(doc).toContain('::frame')
    expect(doc).toContain('- [x] Checked')
    expect(doc).toContain('{align="right"}')
    expect(doc).toContain('{align="center"}')
    expect(doc).toContain('{lineNumbers}')
  })

  it('compiles to native ops including table-embed, banners, and toggles', () => {
    const { ops } = compileCufm(doc)
    const types = new Set(
      ops.map(op => embedType(op.insert)).filter((t): t is string => Boolean(t)),
    )
    expect(types.has('table-embed')).toBe(true)
    expect(types.has('table_content')).toBe(true)
    expect(types.has('divider')).toBe(true)
    expect(types.has('button')).toBe(true)
    expect(ops.some(op => op.attributes?.['advanced-banner-color'] === 'pink-strong')).toBe(true)
    expect(
      ops.some(op => (op.attributes?.list as { list?: string } | undefined)?.list === 'toggled'),
    ).toBe(true)
    expect(ops[0]).toEqual({ insert: 'Tight H1' })
    expect(ops[1]?.attributes).toMatchObject({ header: 1 })
    expect(ops[2]).toEqual({
      insert: 'This paragraph must sit directly under the H1 with no extra blank block.',
    })
  })
})
