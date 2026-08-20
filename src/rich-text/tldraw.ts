import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

export const TLDRAW_PIXEL_RATIO = 2

const execFileAsync = promisify(execFile)

type TldrawExporter = (path: string) => Promise<Buffer>

export async function renderTldrawPng(
  source: string,
  exporter: TldrawExporter = exportTldrawPng,
): Promise<{
  png: Buffer
  width: number
  height: number
  pixelWidth: number
  pixelHeight: number
}> {
  JSON.parse(source)
  const dir = await mkdtemp(join(tmpdir(), 'cup-tldraw-'))
  const path = join(dir, 'diagram.tldr')
  try {
    await writeFile(path, source)
    const png = await exporter(path)
    const { width: pixelWidth, height: pixelHeight } = pngDimensions(png)
    return {
      png,
      width: Math.ceil(pixelWidth / TLDRAW_PIXEL_RATIO),
      height: Math.ceil(pixelHeight / TLDRAW_PIXEL_RATIO),
      pixelWidth,
      pixelHeight,
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function exportTldrawPng(path: string): Promise<Buffer> {
  const { stdout } = await execFileAsync(
    'tldraw',
    ['export', path, '--format', 'png', '--scale', String(TLDRAW_PIXEL_RATIO), '--print'],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, timeout: 120_000 },
  )
  return Buffer.from(stdout.toString().trim(), 'base64')
}

export function pngDimensions(png: Buffer): { width: number; height: number } {
  if (
    png.length < 24 ||
    png.subarray(0, 8).toString('binary') !== '\x89PNG\r\n\x1a\n' ||
    png.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error('tldraw did not produce a valid PNG')
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}
