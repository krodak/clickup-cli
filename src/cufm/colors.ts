/**
 * ClickUp editor color tokens observed in native Quill (`background-class`,
 * `badge-class`, `color-class`, `block-color`, `advanced-banner-color`).
 *
 * Bases are supported by text, highlight, badge, block background, and banner
 * channels. Banners also support `-strong` variants.
 *
 * `cup task-sync doctor` writes every supported channel/token combination so a
 * visual pass can catch changes in ClickUp's editor behavior.
 */
export const COLOR_BASES = [
  'grey',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
] as const

export type ColorBase = (typeof COLOR_BASES)[number]

export function colorTokens(): string[] {
  return COLOR_BASES.flatMap(base => [base, `${base}-strong`])
}

export const BANNER_COLORS = colorTokens()

export const TEXT_COLORS = [...COLOR_BASES]

export const HIGHLIGHT_COLORS = [...COLOR_BASES]

export const BADGE_COLORS = [...COLOR_BASES]
