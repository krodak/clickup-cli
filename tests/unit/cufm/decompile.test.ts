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
