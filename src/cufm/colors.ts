/**
 * ClickUp editor color tokens observed in native Quill (`background-class`,
 * `badge-class`, `color-class`, `block-color`, `advanced-banner-color`).
 *
 * Bases are the text / highlight / badge chips. Banners also use `-strong`
 * variants (confirmed: `pink-strong`, `blue-strong` on 86bbhau05).
 *
 * `cup task-sync doctor` writes every token in every channel so a visual pass
 * can catch chips this catalog is missing.
 */
export const COLOR_BASES = [
  'grey',
  'red',
  'orange',
  'yellow',
  'green',
  'mint',
  'teal',
  'blue',
  'indigo',
  'purple',
  'violet',
  'pink',
  'brown',
] as const

export type ColorBase = (typeof COLOR_BASES)[number]

export function colorTokens(): string[] {
  return COLOR_BASES.flatMap(base => [base, `${base}-strong`])
}

export const BANNER_COLORS = colorTokens()

export const TEXT_COLORS = colorTokens()

export const HIGHLIGHT_COLORS = colorTokens()

export const BADGE_COLORS = colorTokens()
