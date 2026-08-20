import { describe, expect, it } from 'vitest'
import {
  BADGE_COLORS,
  BANNER_COLORS,
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
} from '../../../src/cufm/colors.js'
import { compileCufm } from '../../../src/cufm/compile.js'
import { generateDoctorDocument } from '../../../src/cufm/doctor-document.js'
import { embedType } from '../../../src/rich-text/delta.js'

describe('doctor document', () => {
  const doc = generateDoctorDocument({ userId: 1, username: 'Colin', taskId: 'abc' })

  it('covers every supported color in its channel', () => {
    for (const token of TEXT_COLORS) {
      expect(doc).toContain(`[${token}]{color="${token}"}`)
      expect(doc).toContain(`${token} block {background="${token}"}`)
    }
    for (const token of HIGHLIGHT_COLORS) {
      expect(doc).toContain(`[${token}]{highlight="${token}"}`)
    }
    for (const token of BADGE_COLORS) {
      expect(doc).toContain(`:badge[${token}]{color="${token}"}`)
    }
    for (const token of BANNER_COLORS) {
      expect(doc).toContain(`::banner{color="${token}"}`)
    }
  })

  it('covers structural CUFM features', () => {
    expect(doc).toContain('# Tight H1')
    expect(doc).toContain('::toc')
    expect(doc).toContain('::toggle{title="Nested parent"}')
    expect(doc).toContain('::columns')
    expect(doc).toContain('::table{widths="120,240,360"}')
    expect(doc).toContain('**bold** and ~~strike~~')
    expect(doc).toContain('```mermaid')
    expect(doc).toContain('::quote{size="large"}')
    expect(doc).toContain('::button')
    expect(doc).toContain('::frame')
    expect(doc).toContain('- [x] Checked')
    expect(doc).toContain('{align="right"}')
    expect(doc).toContain('{align="center"}')
    expect(doc).toContain('{lineNumbers}')
    expect(doc).toContain('## Block backgrounds')
    expect(doc).not.toContain('text on grey block')
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

  it('can include a synced content definition and clone when an existing block is supplied', () => {
    const withSync = generateDoctorDocument({
      syncedContent: { id: 'sync-1', body: 'This is a synced content block' },
    })
    const { ops, syncBlocks } = compileCufm(withSync)
    expect(withSync.match(/::sync-block\{id="sync-1"\}/g)).toHaveLength(2)
    expect(syncBlocks).toEqual([
      {
        id: 'sync-1',
        ops: [{ insert: 'This is a synced content block' }, { insert: '\n' }],
      },
    ])
    expect(ops.filter(op => embedType(op.insert) === 'sync-block')).toHaveLength(2)
  })
})
