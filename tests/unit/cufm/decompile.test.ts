import { describe, expect, it } from 'vitest'

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
    expect(decompileCufm(ops)).toBe('**one**\n**two**\nthree\n')
  })
})
