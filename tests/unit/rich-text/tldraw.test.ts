import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import {
  pngDimensions,
  renderTldrawPng,
  TLDRAW_PIXEL_RATIO,
} from '../../../src/rich-text/tldraw.js'

function pngHeader(width: number, height: number): Buffer {
  const png = Buffer.alloc(24)
  png.set(Buffer.from('\x89PNG\r\n\x1a\n', 'binary'))
  png.write('IHDR', 12, 'ascii')
  png.writeUInt32BE(width, 16)
  png.writeUInt32BE(height, 20)
  return png
}

describe('tldraw renderer', () => {
  it('reads dimensions from a PNG header', () => {
    expect(pngDimensions(pngHeader(1280, 720))).toEqual({ width: 1280, height: 720 })
  })

  it('rejects invalid PNG output', () => {
    expect(() => pngDimensions(Buffer.from('not a png'))).toThrow(
      'tldraw did not produce a valid PNG',
    )
  })

  it('rejects invalid tldraw JSON before invoking the exporter', async () => {
    await expect(renderTldrawPng('not json')).rejects.toThrow(SyntaxError)
  })

  it('writes the source and reports logical and pixel dimensions', async () => {
    const source = '{"tldrawFileFormatVersion":1,"records":[]}'
    const result = await renderTldrawPng(source, async path => {
      expect(await readFile(path, 'utf8')).toBe(source)
      return pngHeader(1281, 721)
    })
    expect(result).toMatchObject({
      width: 641,
      height: 361,
      pixelWidth: 1281,
      pixelHeight: 721,
    })
    expect(TLDRAW_PIXEL_RATIO).toBe(2)
  })
})
