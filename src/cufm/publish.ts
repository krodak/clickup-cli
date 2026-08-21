import { access } from 'node:fs/promises'
import type { ClickUpClient } from '../api.js'
import { DEFAULT_MERMAID_THEME, renderMermaidPng } from '../rich-text/mermaid.js'
import { renderTldrawPng } from '../rich-text/tldraw.js'
import { collectDiagramSources, compileCufm } from './compile.js'
import type { CompileResult } from './compile.js'
import type { MediaIndex } from '../task-sync/media.js'
import { isRemoteSrc, resolveLocalPath, uploadBytes, uploadLocalImage } from '../task-sync/media.js'

const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)(?:\{[^}]*width="(\d+)"[^}]*\})?/g
const HTML_IMG_RE = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi

export function descriptionNeedsAssets(markdown: string): boolean {
  if (/```\s*(?:mermaid|tldraw)\b/i.test(markdown) || /::(?:mermaid|tldraw)\b/.test(markdown)) {
    return true
  }
  if (/^::sync-block\b/m.test(markdown)) return true
  IMAGE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = IMAGE_RE.exec(markdown)) !== null) {
    if (m[1] && !isRemoteSrc(m[1])) return true
  }
  HTML_IMG_RE.lastIndex = 0
  while ((m = HTML_IMG_RE.exec(markdown)) !== null) {
    if (m[1] && !isRemoteSrc(m[1])) return true
  }
  return false
}

export async function compileForTask(opts: {
  markdown: string
  client: ClickUpClient
  taskId: string
  baseDir: string
  media: MediaIndex
  mermaidTheme?: string
}): Promise<CompileResult> {
  const theme = opts.mermaidTheme ?? DEFAULT_MERMAID_THEME
  const uploaded = new Map<string, { url: string; width?: number }>()
  for (const img of collectLocalImages(opts.markdown, opts.baseDir)) {
    try {
      await access(img.path)
      const entry = await uploadLocalImage(opts.client, opts.taskId, img.path, opts.media)
      if (entry.url) uploaded.set(img.src, { url: entry.url, width: img.width ?? entry.width })
    } catch {
      /* skip missing files */
    }
  }

  const warnings: string[] = []
  const diagrams = collectDiagramSources(opts.markdown)

  const mermaidCache = new Map<
    string,
    { url: string; width?: number; naturalWidth?: number; naturalHeight?: number }
  >()
  for (const diagram of diagrams) {
    if (diagram.language !== 'mermaid') continue
    const diagramTheme = diagram.meta.theme ?? theme
    const key = mermaidCacheKey(diagram.source, diagramTheme)
    if (mermaidCache.has(key)) continue
    try {
      const rendered = await renderMermaidPng(diagram.source, diagramTheme)
      const entry = await uploadBytes(
        opts.client,
        opts.taskId,
        rendered.png,
        'png',
        opts.media,
        `mermaid:${diagram.source.slice(0, 24)}`,
      )
      mermaidCache.set(key, {
        url: entry.url ?? '',
        width: rendered.width,
        naturalWidth: rendered.pixelWidth,
        naturalHeight: rendered.pixelHeight,
      })
    } catch (err) {
      warnings.push(`mermaid render failed: ${errorMessage(err)}`)
    }
  }

  const tldrawCache = new Map<
    string,
    { url: string; width?: number; naturalWidth?: number; naturalHeight?: number }
  >()
  for (const diagram of diagrams) {
    if (diagram.language !== 'tldraw') continue
    const key = tldrawCacheKey(diagram.source)
    if (tldrawCache.has(key)) continue
    try {
      const rendered = await renderTldrawPng(diagram.source)
      const entry = await uploadBytes(
        opts.client,
        opts.taskId,
        rendered.png,
        'png',
        opts.media,
        `tldraw:${diagram.source.slice(0, 24)}`,
      )
      tldrawCache.set(key, {
        url: entry.url ?? '',
        width: rendered.width,
        naturalWidth: rendered.pixelWidth,
        naturalHeight: rendered.pixelHeight,
      })
    } catch (err) {
      warnings.push(`tldraw render failed: ${errorMessage(err)}`)
    }
  }

  return compileCufm(opts.markdown, {
    warnings,
    resolveImage: (src, width) => {
      if (isRemoteSrc(src)) return { url: src, width }
      const hit = uploaded.get(src)
      if (hit) return { url: hit.url, width: width ?? hit.width }
      return { url: src, width }
    },
    renderMermaid: (source, meta) => {
      const hit = mermaidCache.get(mermaidCacheKey(source, meta.theme ?? theme))
      if (!hit) return undefined
      const width = meta.width ? Number(meta.width) : hit.width
      return { ...hit, width }
    },
    renderTldraw: (source, meta) => {
      const hit = tldrawCache.get(tldrawCacheKey(source))
      if (!hit) return undefined
      const width = meta.width ? Number(meta.width) : hit.width
      return { ...hit, width }
    },
  })
}

export function compilePlain(markdown: string): CompileResult {
  return compileCufm(markdown)
}

function mermaidCacheKey(source: string, theme: string): string {
  return `${theme}\n${source}`
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function tldrawCacheKey(source: string): string {
  try {
    return JSON.stringify(JSON.parse(source))
  } catch {
    return source
  }
}

function collectLocalImages(
  markdown: string,
  baseDir: string,
): Array<{ src: string; path: string; width?: number }> {
  const out: Array<{ src: string; path: string; width?: number }> = []
  const seen = new Set<string>()
  const add = (src: string, width?: number) => {
    if (!src || isRemoteSrc(src) || seen.has(src)) return
    seen.add(src)
    out.push({ src, path: resolveLocalPath(src, baseDir), width })
  }
  IMAGE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = IMAGE_RE.exec(markdown)) !== null) {
    add(m[1]!, m[2] ? Number(m[2]) : undefined)
  }
  HTML_IMG_RE.lastIndex = 0
  while ((m = HTML_IMG_RE.exec(markdown)) !== null) {
    add(m[1]!)
  }
  return out
}
