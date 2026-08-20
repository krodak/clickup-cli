import { access } from 'node:fs/promises'
import type { ClickUpClient } from '../api.js'
import { DEFAULT_MERMAID_THEME, renderMermaidPng } from '../rich-text/mermaid.js'
import { compileCufm } from './compile.js'
import type { CompileResult } from './compile.js'
import type { MediaIndex } from '../task-sync/media.js'
import { isRemoteSrc, resolveLocalPath, uploadBytes, uploadLocalImage } from '../task-sync/media.js'

const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)(?:\{[^}]*width="(\d+)"[^}]*\})?/g
const HTML_IMG_RE = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi

export function descriptionNeedsAssets(markdown: string): boolean {
  if (/```\s*mermaid\b/i.test(markdown) || /::mermaid\b/.test(markdown)) return true
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

  const mermaidCache = new Map<
    string,
    { url: string; width?: number; naturalWidth?: number; naturalHeight?: number }
  >()
  const sources = collectMermaidSources(opts.markdown)
  for (const { source, themeOverride } of sources) {
    if (mermaidCache.has(source)) continue
    try {
      const rendered = await renderMermaidPng(source, themeOverride ?? theme)
      const entry = await uploadBytes(
        opts.client,
        opts.taskId,
        rendered.png,
        'png',
        opts.media,
        `mermaid:${source.slice(0, 24)}`,
      )
      mermaidCache.set(source, {
        url: entry.url ?? '',
        width: rendered.width,
        naturalWidth: rendered.pixelWidth,
        naturalHeight: rendered.pixelHeight,
      })
    } catch {
      /* compile will warn */
    }
  }

  return compileCufm(opts.markdown, {
    resolveImage: (src, width) => {
      if (isRemoteSrc(src)) return { url: src, width }
      const hit = uploaded.get(src)
      if (hit) return { url: hit.url, width: width ?? hit.width }
      return { url: src, width }
    },
    renderMermaid: (source, meta) => {
      const hit = mermaidCache.get(source)
      if (!hit) return undefined
      const width = meta.width ? Number(meta.width) : hit.width
      return { ...hit, width }
    },
  })
}

export function compilePlain(markdown: string): CompileResult {
  return compileCufm(markdown)
}

function collectMermaidSources(
  markdown: string,
): Array<{ source: string; themeOverride?: string }> {
  const out: Array<{ source: string; themeOverride?: string }> = []
  const fence = /```mermaid([^\n]*)\n([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = fence.exec(markdown)) !== null) {
    out.push({ source: m[2]!.replace(/\n$/, '') })
  }
  const block = /::mermaid(?:\{([^}]*)\})?\n([\s\S]*?)::/g
  while ((m = block.exec(markdown)) !== null) {
    const props = m[1] ?? ''
    const themeMatch = /theme="([^"]+)"/.exec(props)
    out.push({ source: m[2]!.trimEnd(), themeOverride: themeMatch?.[1] })
  }
  return out
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
