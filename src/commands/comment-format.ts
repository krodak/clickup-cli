export interface CommentBlock {
  text: string
  attributes?: Record<string, unknown>
}

const HEADER_RE = /^(#{1,6})\s+(.+)$/
const BULLET_RE = /^[-*]\s+(.+)$/
const ORDERED_RE = /^\d+\.\s+(.+)$/
const BLOCKQUOTE_RE = /^>\s+(.+)$/
const HR_RE = /^(---+|\*\*\*+|___+)\s*$/
const FENCED_OPEN_RE = /^```(\w*)$/
const FENCED_CLOSE_RE = /^```\s*$/

function processInlineFormatting(text: string, lineAttrs: Record<string, unknown>): CommentBlock[] {
  const blocks: CommentBlock[] = []
  let remaining = text

  while (remaining.length > 0) {
    let earliestIndex = remaining.length
    let matchType = ''
    let matchResult: RegExpExecArray | null = null

    const patterns: Array<{ type: string; re: RegExp }> = [
      { type: 'code', re: /`([^`]+)`/ },
      { type: 'bolditalic', re: /\*{3}([^*]+)\*{3}/ },
      { type: 'bold', re: /\*{2}([^*]+)\*{2}/ },
      { type: 'italic', re: /(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/ },
      { type: 'strike', re: /~~([^~]+)~~/ },
      { type: 'link', re: /\[([^\]]+)\]\(([^)]+)\)/ },
    ]

    for (const { type, re } of patterns) {
      const m = re.exec(remaining)
      if (m && m.index < earliestIndex) {
        earliestIndex = m.index
        matchType = type
        matchResult = m
      }
    }

    if (!matchResult) {
      if (remaining.length > 0) {
        blocks.push({
          text: remaining,
          ...(Object.keys(lineAttrs).length > 0 ? { attributes: { ...lineAttrs } } : {}),
        })
      }
      break
    }

    if (earliestIndex > 0) {
      blocks.push({
        text: remaining.slice(0, earliestIndex),
        ...(Object.keys(lineAttrs).length > 0 ? { attributes: { ...lineAttrs } } : {}),
      })
    }

    const innerText = matchResult[1]!
    switch (matchType) {
      case 'code':
        blocks.push({ text: innerText, attributes: { ...lineAttrs, code: true } })
        break
      case 'bolditalic':
        blocks.push({ text: innerText, attributes: { ...lineAttrs, bold: true, italic: true } })
        break
      case 'bold':
        blocks.push({ text: innerText, attributes: { ...lineAttrs, bold: true } })
        break
      case 'italic':
        blocks.push({ text: innerText, attributes: { ...lineAttrs, italic: true } })
        break
      case 'strike':
        blocks.push({ text: innerText, attributes: { ...lineAttrs, strike: true } })
        break
      case 'link':
        blocks.push({
          text: innerText,
          attributes: { ...lineAttrs, link: matchResult[2]! },
        })
        break
    }

    remaining = remaining.slice(earliestIndex + matchResult[0].length)
  }

  return blocks
}

export function markdownToCommentBlocks(markdown: string): CommentBlock[] {
  if (!markdown) return [{ text: '' }]

  const lines = markdown.split('\n')
  const blocks: CommentBlock[] = []
  let inCodeBlock = false
  let codeBlockLang = ''
  let codeBlockContent = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    if (inCodeBlock) {
      if (FENCED_CLOSE_RE.test(line)) {
        const lang = codeBlockLang || true
        blocks.push({
          text: codeBlockContent,
          attributes: { 'code-block': lang },
        })
        inCodeBlock = false
        codeBlockLang = ''
        codeBlockContent = ''
      } else {
        codeBlockContent += (codeBlockContent.length > 0 ? '\n' : '') + line
      }
      continue
    }

    const fencedOpen = FENCED_OPEN_RE.exec(line)
    if (fencedOpen) {
      inCodeBlock = true
      codeBlockLang = fencedOpen[1] ?? ''
      codeBlockContent = ''
      continue
    }

    if (HR_RE.test(line)) {
      blocks.push({ text: '\n', attributes: { divider: true } })
      continue
    }

    const headerMatch = HEADER_RE.exec(line)
    if (headerMatch) {
      const level = headerMatch[1]!.length
      const content = headerMatch[2]!
      const inlineBlocks = processInlineFormatting(content, {})
      for (const b of inlineBlocks) {
        blocks.push(b)
      }
      blocks.push({ text: '\n', attributes: { header: level } })
      continue
    }

    const bulletMatch = BULLET_RE.exec(line)
    if (bulletMatch) {
      const content = bulletMatch[1]!
      const inlineBlocks = processInlineFormatting(content, {})
      for (const b of inlineBlocks) {
        blocks.push(b)
      }
      blocks.push({ text: '\n', attributes: { list: 'bullet' } })
      continue
    }

    const orderedMatch = ORDERED_RE.exec(line)
    if (orderedMatch) {
      const content = orderedMatch[1]!
      const inlineBlocks = processInlineFormatting(content, {})
      for (const b of inlineBlocks) {
        blocks.push(b)
      }
      blocks.push({ text: '\n', attributes: { list: 'ordered' } })
      continue
    }

    const blockquoteMatch = BLOCKQUOTE_RE.exec(line)
    if (blockquoteMatch) {
      const content = blockquoteMatch[1]!
      const inlineBlocks = processInlineFormatting(content, {})
      for (const b of inlineBlocks) {
        blocks.push(b)
      }
      blocks.push({ text: '\n', attributes: { blockquote: true } })
      continue
    }

    if (line === '') {
      blocks.push({ text: '\n' })
      continue
    }

    const inlineBlocks = processInlineFormatting(line, {})
    for (const b of inlineBlocks) {
      blocks.push(b)
    }
    blocks.push({ text: '\n' })
  }

  if (inCodeBlock && codeBlockContent.length > 0) {
    const lang = codeBlockLang || true
    blocks.push({
      text: codeBlockContent,
      attributes: { 'code-block': lang },
    })
  }

  return blocks
}
