import { describe, it, expect } from 'vitest'
import { markdownToCommentBlocks } from '../../../src/commands/comment-format.js'

describe('markdownToCommentBlocks', () => {
  it('converts plain text to blocks', () => {
    const blocks = markdownToCommentBlocks('hello world')
    expect(blocks).toEqual([{ text: 'hello world' }, { text: '\n' }])
  })

  it('converts h1 header', () => {
    const blocks = markdownToCommentBlocks('# Title')
    expect(blocks).toEqual([{ text: 'Title' }, { text: '\n', attributes: { header: 1 } }])
  })

  it('converts h2 header', () => {
    const blocks = markdownToCommentBlocks('## Subtitle')
    expect(blocks).toEqual([{ text: 'Subtitle' }, { text: '\n', attributes: { header: 2 } }])
  })

  it('converts h3 through h6 headers', () => {
    for (let level = 3; level <= 6; level++) {
      const prefix = '#'.repeat(level)
      const blocks = markdownToCommentBlocks(`${prefix} Heading ${level}`)
      expect(blocks).toEqual([
        { text: `Heading ${level}` },
        { text: '\n', attributes: { header: level } },
      ])
    }
  })

  it('converts bold text', () => {
    const blocks = markdownToCommentBlocks('some **bold** text')
    expect(blocks).toEqual([
      { text: 'some ' },
      { text: 'bold', attributes: { bold: true } },
      { text: ' text' },
      { text: '\n' },
    ])
  })

  it('converts italic text', () => {
    const blocks = markdownToCommentBlocks('some *italic* text')
    expect(blocks).toEqual([
      { text: 'some ' },
      { text: 'italic', attributes: { italic: true } },
      { text: ' text' },
      { text: '\n' },
    ])
  })

  it('converts bold+italic text', () => {
    const blocks = markdownToCommentBlocks('some ***bolditalic*** text')
    expect(blocks).toEqual([
      { text: 'some ' },
      { text: 'bolditalic', attributes: { bold: true, italic: true } },
      { text: ' text' },
      { text: '\n' },
    ])
  })

  it('converts strikethrough', () => {
    const blocks = markdownToCommentBlocks('some ~~deleted~~ text')
    expect(blocks).toEqual([
      { text: 'some ' },
      { text: 'deleted', attributes: { strike: true } },
      { text: ' text' },
      { text: '\n' },
    ])
  })

  it('converts inline code', () => {
    const blocks = markdownToCommentBlocks('use `console.log` here')
    expect(blocks).toEqual([
      { text: 'use ' },
      { text: 'console.log', attributes: { code: true } },
      { text: ' here' },
      { text: '\n' },
    ])
  })

  it('converts code block with language', () => {
    const blocks = markdownToCommentBlocks('```typescript\nconst x = 1\n```')
    expect(blocks).toEqual([{ text: 'const x = 1', attributes: { 'code-block': 'typescript' } }])
  })

  it('converts code block without language', () => {
    const blocks = markdownToCommentBlocks('```\nsome code\n```')
    expect(blocks).toEqual([{ text: 'some code', attributes: { 'code-block': true } }])
  })

  it('converts bullet list', () => {
    const blocks = markdownToCommentBlocks('- item one\n- item two')
    expect(blocks).toEqual([
      { text: 'item one' },
      { text: '\n', attributes: { list: 'bullet' } },
      { text: 'item two' },
      { text: '\n', attributes: { list: 'bullet' } },
    ])
  })

  it('converts bullet list with asterisk marker', () => {
    const blocks = markdownToCommentBlocks('* first\n* second')
    expect(blocks).toEqual([
      { text: 'first' },
      { text: '\n', attributes: { list: 'bullet' } },
      { text: 'second' },
      { text: '\n', attributes: { list: 'bullet' } },
    ])
  })

  it('converts numbered list', () => {
    const blocks = markdownToCommentBlocks('1. first\n2. second')
    expect(blocks).toEqual([
      { text: 'first' },
      { text: '\n', attributes: { list: 'ordered' } },
      { text: 'second' },
      { text: '\n', attributes: { list: 'ordered' } },
    ])
  })

  it('converts blockquote', () => {
    const blocks = markdownToCommentBlocks('> important note')
    expect(blocks).toEqual([
      { text: 'important note' },
      { text: '\n', attributes: { blockquote: true } },
    ])
  })

  it('converts link', () => {
    const blocks = markdownToCommentBlocks('visit [Google](https://google.com) now')
    expect(blocks).toEqual([
      { text: 'visit ' },
      { text: 'Google', attributes: { link: 'https://google.com' } },
      { text: ' now' },
      { text: '\n' },
    ])
  })

  it('converts horizontal rule', () => {
    const blocks = markdownToCommentBlocks('---')
    expect(blocks).toEqual([{ text: '\n', attributes: { divider: true } }])
  })

  it('converts horizontal rule with asterisks', () => {
    const blocks = markdownToCommentBlocks('***')
    expect(blocks).toEqual([{ text: '\n', attributes: { divider: true } }])
  })

  it('converts horizontal rule with underscores', () => {
    const blocks = markdownToCommentBlocks('___')
    expect(blocks).toEqual([{ text: '\n', attributes: { divider: true } }])
  })

  it('converts mixed content', () => {
    const md = '## Results\n\n**Passed**: 15/15\n- Unit tests\n- Integration'
    const blocks = markdownToCommentBlocks(md)
    expect(blocks).toEqual([
      { text: 'Results' },
      { text: '\n', attributes: { header: 2 } },
      { text: '\n' },
      { text: 'Passed', attributes: { bold: true } },
      { text: ': 15/15' },
      { text: '\n' },
      { text: 'Unit tests' },
      { text: '\n', attributes: { list: 'bullet' } },
      { text: 'Integration' },
      { text: '\n', attributes: { list: 'bullet' } },
    ])
  })

  it('handles empty string', () => {
    const blocks = markdownToCommentBlocks('')
    expect(blocks).toEqual([{ text: '' }])
  })

  it('handles plain text without any markdown', () => {
    const blocks = markdownToCommentBlocks('just some plain text here')
    expect(blocks).toEqual([{ text: 'just some plain text here' }, { text: '\n' }])
    for (const b of blocks) {
      expect(b.attributes).toBeUndefined()
    }
  })

  it('converts multi-line paragraphs', () => {
    const blocks = markdownToCommentBlocks('first line\nsecond line\nthird line')
    expect(blocks).toEqual([
      { text: 'first line' },
      { text: '\n' },
      { text: 'second line' },
      { text: '\n' },
      { text: 'third line' },
      { text: '\n' },
    ])
  })

  it('handles header with inline bold', () => {
    const blocks = markdownToCommentBlocks('## **Bold** Header')
    expect(blocks).toEqual([
      { text: 'Bold', attributes: { bold: true } },
      { text: ' Header' },
      { text: '\n', attributes: { header: 2 } },
    ])
  })

  it('handles bullet list with inline code', () => {
    const blocks = markdownToCommentBlocks('- use `npm test`')
    expect(blocks).toEqual([
      { text: 'use ' },
      { text: 'npm test', attributes: { code: true } },
      { text: '\n', attributes: { list: 'bullet' } },
    ])
  })

  it('handles multiple inline formats in one line', () => {
    const blocks = markdownToCommentBlocks('**bold** and *italic* and `code`')
    expect(blocks).toEqual([
      { text: 'bold', attributes: { bold: true } },
      { text: ' and ' },
      { text: 'italic', attributes: { italic: true } },
      { text: ' and ' },
      { text: 'code', attributes: { code: true } },
      { text: '\n' },
    ])
  })

  it('preserves multi-line code block content', () => {
    const blocks = markdownToCommentBlocks('```js\nline 1\nline 2\nline 3\n```')
    expect(blocks).toEqual([{ text: 'line 1\nline 2\nline 3', attributes: { 'code-block': 'js' } }])
  })

  it('handles unclosed code block gracefully', () => {
    const blocks = markdownToCommentBlocks('```python\nprint("hi")')
    expect(blocks).toEqual([{ text: 'print("hi")', attributes: { 'code-block': 'python' } }])
  })

  it('handles blockquote with inline formatting', () => {
    const blocks = markdownToCommentBlocks('> this is **important**')
    expect(blocks).toEqual([
      { text: 'this is ' },
      { text: 'important', attributes: { bold: true } },
      { text: '\n', attributes: { blockquote: true } },
    ])
  })

  it('handles empty lines between content', () => {
    const blocks = markdownToCommentBlocks('first\n\nsecond')
    expect(blocks).toEqual([
      { text: 'first' },
      { text: '\n' },
      { text: '\n' },
      { text: 'second' },
      { text: '\n' },
    ])
  })
})
