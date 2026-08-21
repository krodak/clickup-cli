import { describe, expect, it } from 'vitest'
import { compileCufm } from '../../../src/cufm/compile.js'
import { decompileCufm } from '../../../src/cufm/decompile.js'
import { generateDoctorDocument } from '../../../src/cufm/doctor-document.js'
import { auditLocalRoundTrip, auditStructure } from '../../../src/task-sync/doctor.js'

const doc = generateDoctorDocument({ userId: 1, username: 'Colin', taskId: 'abc' })

function failing(md: string): string[] {
  return auditStructure(md, 'x')
    .filter(check => !check.ok)
    .map(check => check.id.replace(/^x:/, ''))
}

describe('doctor structure audit', () => {
  it('passes on the document the doctor actually ships', () => {
    const checks = auditLocalRoundTrip(doc)
    expect(checks.filter(c => !c.ok)).toEqual([])
    expect(checks.length).toBeGreaterThan(10)
  })

  it('reports a fixed point so repeated pulls do not rewrite the task file', () => {
    const fixedPoint = auditLocalRoundTrip(doc).find(c => c.id === 'local:fixed-point')
    expect(fixedPoint?.ok).toBe(true)
  })

  // Each mangling below is how the pre-fix decompiler damaged the document. If an
  // assertion stops catching its mangling it has become decorative.
  const good = decompileCufm(compileCufm(doc).ops)

  it.each([
    [
      'code-block-whole',
      // One complete fence per line, as the old per-line code emitter produced.
      (md: string) =>
        md.replace(/```json \{lineNumbers\}\n([\s\S]*?)\n```/, (_m, body: string) =>
          body
            .split('\n')
            .map(line => '```json\n' + line + '\n```')
            .join('\n'),
        ),
    ],
    [
      'mentions-inline',
      (md: string) => md.replace(/:task\[[^\]]*\] /g, match => `\n${match.trim()}\n`),
    ],
    [
      'adjacent-emphasis',
      (md: string) =>
        md.replace('**`SDR` is the consumed value**', '**`SDR`**** is the consumed value**'),
    ],
    [
      'banner-grouped',
      (md: string) =>
        md.replace(
          '\n\nSecond paragraph must stay inside the same banner',
          '\n::\n\nSecond paragraph must stay inside the same banner',
        ),
    ],
    ['ordered-numbering', (md: string) => md.replace(/^(\d)\. Ordered/gm, '1. Ordered')],
    ['ordered-nesting', (md: string) => md.replace(/^ {3}(\d\. Ordered 1\.)/gm, '  $1')],
    [
      'columns-kept',
      (md: string) => md.replace(/^ *:{2,}column.*$/gm, '').replace(/^::columns$/m, ''),
    ],
    [
      'diagram-fence',
      // The old decompiler left ClickUp's "mermaid source" toggle in place.
      (md: string) => md.replace(/^```mermaid$/m, '::toggle{title="mermaid source"}\n```mermaid'),
    ],
  ])('catches a regression that breaks %s', (id, mangle) => {
    expect(failing(good)).toEqual([])
    expect(failing(mangle(good))).toContain(id)
  })

  it('catches a table cell that lost its inline formatting', () => {
    const stripped = good.replace(/^\| `code` \| \*italic\*(.*)$/m, '| code | italic$1')
    expect(failing(stripped)).toContain('table-cell-marks')
  })

  it('catches an unclosed component', () => {
    const unclosed = good.replace(/^::$/m, '')
    expect(failing(unclosed)).toContain('components-balanced')
  })
})
