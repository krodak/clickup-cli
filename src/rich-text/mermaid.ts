// beautiful-mermaid (+elkjs) and the native resvg addon cost >100ms to load; import
// them only when a diagram is actually rendered so plain commands start fast.

export const DEFAULT_MERMAID_THEME = 'github-light'

export async function mermaidThemeColors(name: string): Promise<{
  bg: string
  fg: string
  line?: string
  accent?: string
  muted?: string
  surface?: string
  border?: string
}> {
  const { THEMES } = await import('beautiful-mermaid')
  const themes: Record<string, { bg: string; fg: string }> = THEMES
  return themes[name] ?? themes[DEFAULT_MERMAID_THEME] ?? { bg: '#ffffff', fg: '#27272A' }
}

export async function renderMermaidPng(
  source: string,
  themeName = DEFAULT_MERMAID_THEME,
): Promise<{ png: Buffer; svg: string; width: number; height: number }> {
  const [{ renderMermaid }, { Resvg }] = await Promise.all([
    import('beautiful-mermaid'),
    import('@resvg/resvg-js'),
  ])
  const colors = await mermaidThemeColors(themeName)
  const svg = await renderMermaid(source, { ...colors, transparent: false })
  const inlined = inlineSvgColors(svg, colors)
  const resvg = new Resvg(inlined, { fitTo: { mode: 'original' } })
  const img = resvg.render()
  return { png: Buffer.from(img.asPng()), svg: inlined, width: img.width, height: img.height }
}

function mixHex(fg: string, bg: string, fgPercent: number): string {
  const f = hexToRgb(fg)
  const b = hexToRgb(bg)
  if (!f || !b) return fg
  const t = fgPercent / 100
  const r = Math.round(f.r * t + b.r * (1 - t))
  const g = Math.round(f.g * t + b.g * (1 - t))
  const bl = Math.round(f.b * t + b.b * (1 - t))
  return rgbToHex(r, g, bl)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | undefined {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return undefined
  const n = Number.parseInt(m[1]!, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`
}

export function inlineSvgColors(
  svg: string,
  colors: {
    bg: string
    fg: string
    line?: string
    accent?: string
    muted?: string
    surface?: string
    border?: string
  },
): string {
  const bg = colors.bg
  const fg = colors.fg
  const line = colors.line ?? mixHex(fg, bg, 30)
  const accent = colors.accent ?? mixHex(fg, bg, 50)
  const muted = colors.muted ?? mixHex(fg, bg, 60)
  const surface = colors.surface ?? mixHex(fg, bg, 3)
  const border = colors.border ?? mixHex(fg, bg, 20)
  const resolved: Record<string, string> = {
    '--bg': bg,
    '--fg': fg,
    '--line': line,
    '--accent': accent,
    '--muted': muted,
    '--surface': surface,
    '--border': border,
    '--_text': fg,
    '--_text-sec': muted,
    '--_text-muted': muted,
    '--_text-faint': mixHex(fg, bg, 22),
    '--_line': line,
    '--_arrow': accent,
    '--_node-fill': surface,
    '--_node-stroke': border,
    '--_group-fill': bg,
    '--_group-hdr': mixHex(fg, bg, 4),
    '--_inner-stroke': mixHex(fg, bg, 10),
    '--_key-badge': mixHex(fg, bg, 8),
  }

  let out = svg
  out = out.replace(
    /color-mix\(\s*in\s+srgb\s*,\s*var\((--[\w-]+)\)\s+(\d+)%\s*,\s*var\((--[\w-]+)\)\s*\)/gi,
    (_all, a: string, pct: string, b: string) =>
      mixHex(resolved[a] ?? fg, resolved[b] ?? bg, Number(pct)),
  )
  out = out.replace(
    /var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g,
    (_all, name: string, fallback: string | undefined) => resolved[name] ?? fallback?.trim() ?? fg,
  )
  return out
}
