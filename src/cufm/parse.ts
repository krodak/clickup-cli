import { createRequire } from 'node:module'
import MarkdownIt from 'markdown-it'
import type { Token } from 'markdown-it'
import comarkPlugin from '@comark/markdown-it'

type MarkdownItPlugin = (md: MarkdownIt, options?: unknown) => void

const require = createRequire(import.meta.url)
const taskLists = require('markdown-it-task-lists') as MarkdownItPlugin

const md = new MarkdownIt({ html: true, linkify: true, breaks: false })
  .use(taskLists, { enabled: true, label: false })
  .use(comarkPlugin as MarkdownItPlugin)

export function parseCufm(source: string): Token[] {
  return md.parse(source, {})
}

export function tokenAttr(token: Token, name: string): string | undefined {
  const pair = token.attrs?.find(a => a[0] === name)
  return pair?.[1]
}

export function tokenAttrMap(token: Token): Record<string, string> {
  const out: Record<string, string> = {}
  if (!token.attrs) return out
  for (const [k, v] of token.attrs) {
    out[k] = v
  }
  return out
}
