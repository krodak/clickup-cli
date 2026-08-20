export {
  BADGE_COLORS,
  BANNER_COLORS,
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
  colorTokens,
} from './colors.js'

export const BLOCK_COMPONENTS = [
  'toc',
  'toggle',
  'banner',
  'quote',
  'columns',
  'column',
  'table',
  'button',
  'frame',
  'mermaid',
  'attachment',
  'sync-block',
  'whiteboard',
  'block-mention',
] as const

export type BlockComponentName = (typeof BLOCK_COMPONENTS)[number]

export const INLINE_COMPONENTS = ['badge', 'user', 'task', 'doc'] as const

export type InlineComponentName = (typeof INLINE_COMPONENTS)[number]

export const ALERT_TO_BANNER: Record<string, string> = {
  NOTE: 'blue',
  TIP: 'green',
  IMPORTANT: 'purple',
  WARNING: 'yellow',
  CAUTION: 'pink-strong',
}

export const HEADER_MAX = 4

export const TABLE_WIDTH_MIN = 75
export const TABLE_WIDTH_MAX = 708
export const TABLE_WIDTH_CHAR_PX = 8
export const TABLE_WIDTH_PAD = 24

export function estimateColumnWidth(maxChars: number): number {
  const raw = TABLE_WIDTH_CHAR_PX * maxChars + TABLE_WIDTH_PAD
  return Math.min(TABLE_WIDTH_MAX, Math.max(TABLE_WIDTH_MIN, raw))
}

export function clampHeader(level: number): number {
  if (level < 1) return 1
  if (level > HEADER_MAX) return HEADER_MAX
  return level
}

export function isBlockComponent(name: string): name is BlockComponentName {
  return (BLOCK_COMPONENTS as readonly string[]).includes(name)
}

export function isInlineComponent(name: string): name is InlineComponentName {
  return (INLINE_COMPONENTS as readonly string[]).includes(name)
}
