import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  exportTldrawPng,
  pngDimensions,
  renderTldrawPng,
  TLDRAW_PIXEL_RATIO,
} from '../../../src/rich-text/tldraw.js'

const PNG_IEND = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])

function pngHeader(width: number, height: number): Buffer {
  const png = Buffer.alloc(24)
  png.set(Buffer.from('\x89PNG\r\n\x1a\n', 'binary'))
  png.write('IHDR', 12, 'ascii')
  png.writeUInt32BE(width, 16)
  png.writeUInt32BE(height, 20)
  return png
}

function pngBytes(width: number, height: number): Buffer {
  return Buffer.concat([pngHeader(width, height), PNG_IEND])
}

describe('tldraw renderer', () => {
  it('reads dimensions from a complete PNG', () => {
    expect(pngDimensions(pngBytes(1280, 720))).toEqual({ width: 1280, height: 720 })
  })

  it('rejects invalid PNG output', () => {
    expect(() => pngDimensions(Buffer.from('not a png'))).toThrow(
      'tldraw did not produce a valid PNG',
    )
  })

  it('rejects a PNG with a valid header but no IEND chunk', () => {
    expect(() => pngDimensions(pngHeader(1280, 720))).toThrow(
      'tldraw produced a truncated PNG (missing IEND chunk)',
    )
  })

  it('rejects a PNG truncated mid-stream', () => {
    const complete = Buffer.concat([pngHeader(1280, 720), Buffer.alloc(4096, 7), PNG_IEND])
    expect(() => pngDimensions(complete.subarray(0, complete.length - 100))).toThrow(
      'tldraw produced a truncated PNG (missing IEND chunk)',
    )
  })

  it('rejects invalid tldraw JSON before invoking the exporter', async () => {
    await expect(renderTldrawPng('not json')).rejects.toThrow(SyntaxError)
  })

  it('writes the source and reports logical and pixel dimensions', async () => {
    const source = '{"tldrawFileFormatVersion":1,"records":[]}'
    const result = await renderTldrawPng(source, async path => {
      expect(await readFile(path, 'utf8')).toBe(source)
      return pngBytes(1281, 721)
    })
    expect(result).toMatchObject({
      width: 641,
      height: 361,
      pixelWidth: 1281,
      pixelHeight: 721,
    })
    expect(TLDRAW_PIXEL_RATIO).toBe(2)
  })

  it('fails the render when the exporter returns a truncated PNG', async () => {
    const source = '{"tldrawFileFormatVersion":1,"records":[]}'
    await expect(renderTldrawPng(source, async () => pngHeader(1281, 721))).rejects.toThrow(
      'tldraw produced a truncated PNG (missing IEND chunk)',
    )
  })
})

describe('exportTldrawPng', () => {
  async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const dir = await mkdtemp(join(tmpdir(), 'cup-tldraw-test-'))
    try {
      return await fn(dir)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }

  it('exports to a file rather than reading stdout', async () => {
    await withTempDir(async dir => {
      const input = join(dir, 'diagram.tldr')
      await writeFile(input, '{"records":[]}')
      const expected = pngBytes(64, 32)
      let seen: readonly string[] = []

      const png = await exportTldrawPng(input, async args => {
        seen = args
        const outputDir = args[args.indexOf('--output') + 1]!
        const name = args[args.indexOf('--name') + 1]!
        await writeFile(join(outputDir, `${name}.png`), expected)
      })

      expect(png).toEqual(expected)
      expect(seen).not.toContain('--print')
      expect(seen).toContain('--output')
      expect(seen[seen.indexOf('--output') + 1]).toBe(dirname(input))
      expect(seen[seen.indexOf('--name') + 1]).toBe('diagram')
      expect(seen.slice(0, 6)).toEqual([
        'export',
        input,
        '--format',
        'png',
        '--scale',
        String(TLDRAW_PIXEL_RATIO),
      ])
    })
  })

  it('ignores whatever the exporter writes to stdout', async () => {
    await withTempDir(async dir => {
      const input = join(dir, 'diagram.tldr')
      await writeFile(input, '{"records":[]}')
      const expected = pngBytes(10, 10)

      const png = await exportTldrawPng(input, async args => {
        const outputDir = args[args.indexOf('--output') + 1]!
        await writeFile(join(outputDir, 'diagram.png'), expected)
        process.stdout.write('')
      })

      expect(png).toEqual(expected)
    })
  })

  it('surfaces the failure when the exporter produced no file', async () => {
    await withTempDir(async dir => {
      const input = join(dir, 'diagram.tldr')
      await writeFile(input, '{"records":[]}')
      await expect(exportTldrawPng(input, async () => undefined)).rejects.toThrow(/ENOENT/)
    })
  })
})
