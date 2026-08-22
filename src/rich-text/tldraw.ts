import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

export const TLDRAW_PIXEL_RATIO = 2

const TLDRAW_OUTPUT_NAME = 'diagram'
const PNG_SIGNATURE = '\x89PNG\r\n\x1a\n'
const PNG_HEADER_BYTES = 24
const PNG_IEND = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])

const execFileAsync = promisify(execFile)

export type TldrawExporter = (path: string) => Promise<Buffer>
export type TldrawRunner = (args: readonly string[]) => Promise<void>

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
  const path = join(dir, `${TLDRAW_OUTPUT_NAME}.tldr`)
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

// Deliberately not `tldraw export --print`: that streams base64 to stdout and exits without
// waiting for the pipe to drain, so a piped consumer silently receives a prefix of the image.
// Writing to a file and reading it back is the only way to get the whole PNG.
export async function exportTldrawPng(
  path: string,
  run: TldrawRunner = runTldraw,
): Promise<Buffer> {
  const outputDir = dirname(path)
  await run([
    'export',
    path,
    '--format',
    'png',
    '--scale',
    String(TLDRAW_PIXEL_RATIO),
    '--output',
    outputDir,
    '--name',
    TLDRAW_OUTPUT_NAME,
  ])
  return readFile(join(outputDir, `${TLDRAW_OUTPUT_NAME}.png`))
}

async function runTldraw(args: readonly string[]): Promise<void> {
  await execFileAsync('tldraw', [...args], { maxBuffer: 64 * 1024 * 1024, timeout: 120_000 })
}

export function pngDimensions(png: Buffer): { width: number; height: number } {
  if (
    png.length < PNG_HEADER_BYTES ||
    png.subarray(0, 8).toString('binary') !== PNG_SIGNATURE ||
    png.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error('tldraw did not produce a valid PNG')
  }
  if (!png.subarray(png.length - PNG_IEND.length).equals(PNG_IEND)) {
    throw new Error('tldraw produced a truncated PNG (missing IEND chunk)')
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}
