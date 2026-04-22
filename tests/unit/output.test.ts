import chalk from 'chalk'
import { describe, it, expect } from 'vitest'
import {
  formatTable,
  isTTY,
  shouldOutputJson,
  colorStatus,
  colorPriority,
  colorDueDate,
} from '../../src/output.js'

describe('formatTable', () => {
  it('includes column labels in output', () => {
    const result = formatTable(
      [{ id: 'abc123', name: 'My task', status: 'open', list: 'Sprint 1' }],
      [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'NAME', maxWidth: 20 },
        { key: 'status', label: 'STATUS' },
      ],
    )
    expect(result).toContain('ID')
    expect(result).toContain('NAME')
    expect(result).toContain('STATUS')
  })

  it('includes row values', () => {
    const result = formatTable(
      [{ id: 'abc123', name: 'My task', status: 'open' }],
      [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'NAME', maxWidth: 20 },
      ],
    )
    expect(result).toContain('abc123')
    expect(result).toContain('My task')
  })

  it('truncates long values to column maxWidth with ellipsis', () => {
    const result = formatTable(
      [{ name: 'This is a very long task name that exceeds the column width limit' }],
      [{ key: 'name', label: 'NAME', maxWidth: 20 }],
    )
    expect(result).toContain('This is a very long')
    expect(result).not.toContain('limit')
    expect(result).toContain('…')
  })

  it('handles missing keys with empty string', () => {
    const result = formatTable(
      [{ id: 'abc' }],
      [
        { key: 'id', label: 'ID' },
        { key: 'missing' as 'id', label: 'MISSING' },
      ],
    )
    expect(result).toContain('abc')
  })

  it('returns empty table with just header when no rows', () => {
    const result = formatTable([], [{ key: 'id', label: 'ID' }])
    expect(result).toContain('ID')
  })

  it('does not truncate status column', () => {
    const result = formatTable(
      [{ status: 'needs definition' }],
      [{ key: 'status', label: 'STATUS' }],
    )
    expect(result).toContain('needs definition')
    expect(result).not.toContain('…')
  })

  it('auto-sizes columns from data', () => {
    const result = formatTable(
      [
        { id: 'abc', name: 'Short' },
        { id: 'defghi', name: 'Longer name here' },
      ],
      [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'NAME', maxWidth: 60 },
      ],
    )
    expect(result).toContain('defghi')
    expect(result).toContain('Short')
    expect(result).not.toContain('…')
  })

  it('caps NAME column at maxWidth and truncates', () => {
    const longName = 'A'.repeat(80)
    const result = formatTable([{ name: longName }], [{ key: 'name', label: 'NAME', maxWidth: 60 }])
    expect(result).toContain('…')
    expect(result).not.toContain(longName)
  })

  it('applies format callback to cell values', () => {
    const result = formatTable(
      [{ name: 'hello' }],
      [{ key: 'name', label: 'NAME', format: v => `[${v}]` }],
    )
    expect(result).toContain('[hello]')
  })
})

describe('shouldOutputJson', () => {
  it('returns true when forceJson is true', () => {
    expect(shouldOutputJson(true)).toBe(true)
  })

  it('returns false when forceJson is false (regardless of TTY)', () => {
    const originalIsTTY = process.stdout.isTTY
    try {
      process.stdout.isTTY = false
      expect(shouldOutputJson(false)).toBe(false)
    } finally {
      process.stdout.isTTY = originalIsTTY
    }
  })

  it('returns true when CU_OUTPUT=json env var is set', () => {
    const original = process.env['CU_OUTPUT']
    try {
      process.env['CU_OUTPUT'] = 'json'
      expect(shouldOutputJson(false)).toBe(true)
    } finally {
      if (original === undefined) delete process.env['CU_OUTPUT']
      else process.env['CU_OUTPUT'] = original
    }
  })

  it('returns false when CU_OUTPUT is not set', () => {
    const original = process.env['CU_OUTPUT']
    try {
      delete process.env['CU_OUTPUT']
      expect(shouldOutputJson(false)).toBe(false)
    } finally {
      if (original === undefined) delete process.env['CU_OUTPUT']
      else process.env['CU_OUTPUT'] = original
    }
  })

  it('returns true when forceJson is true AND CU_OUTPUT=json', () => {
    const original = process.env['CU_OUTPUT']
    try {
      process.env['CU_OUTPUT'] = 'json'
      expect(shouldOutputJson(true)).toBe(true)
    } finally {
      if (original === undefined) delete process.env['CU_OUTPUT']
      else process.env['CU_OUTPUT'] = original
    }
  })
})

describe('isTTY', () => {
  it('returns a boolean', () => {
    expect(typeof isTTY()).toBe('boolean')
  })

  it('is not affected by NO_COLOR (color suppression is handled by chalk)', () => {
    const original = process.env.NO_COLOR
    const wasTTY = process.stdout.isTTY
    try {
      process.env.NO_COLOR = '1'
      expect(isTTY()).toBe(Boolean(wasTTY))
    } finally {
      if (original === undefined) delete process.env.NO_COLOR
      else process.env.NO_COLOR = original
    }
  })
})

describe('colorStatus', () => {
  it('returns green for done statuses', () => {
    expect(colorStatus('done')).toBe(chalk.green('done'))
    expect(colorStatus('Complete')).toBe(chalk.green('Complete'))
    expect(colorStatus('closed')).toBe(chalk.green('closed'))
  })

  it('returns yellow for in-progress statuses', () => {
    expect(colorStatus('in progress')).toBe(chalk.yellow('in progress'))
    expect(colorStatus('in review')).toBe(chalk.yellow('in review'))
    expect(colorStatus('active')).toBe(chalk.yellow('active'))
  })

  it('returns red for blocked statuses', () => {
    expect(colorStatus('blocked')).toBe(chalk.red('blocked'))
    expect(colorStatus('stuck')).toBe(chalk.red('stuck'))
  })

  it('returns dim for unrecognized statuses', () => {
    expect(colorStatus('open')).toBe(chalk.dim('open'))
    expect(colorStatus('to do')).toBe(chalk.dim('to do'))
  })
})

describe('colorPriority', () => {
  it('returns red for urgent', () => {
    expect(colorPriority('urgent')).toBe(chalk.red('urgent'))
  })

  it('returns yellow for high', () => {
    expect(colorPriority('high')).toBe(chalk.yellow('high'))
  })

  it('returns uncolored for normal', () => {
    expect(colorPriority('normal')).toBe('normal')
  })

  it('returns dim for low', () => {
    expect(colorPriority('low')).toBe(chalk.dim('low'))
  })

  it('returns uncolored for unknown priorities', () => {
    expect(colorPriority('custom')).toBe('custom')
  })
})

describe('colorDueDate', () => {
  it('returns red for past timestamps', () => {
    const past = String(Date.now() - 86400000)
    expect(colorDueDate('Jan 1', past)).toBe(chalk.red('Jan 1'))
  })

  it('returns uncolored for future timestamps', () => {
    const future = String(Date.now() + 86400000)
    expect(colorDueDate('Dec 31', future)).toBe('Dec 31')
  })

  it('returns uncolored when no timestamp provided', () => {
    expect(colorDueDate('Jan 1')).toBe('Jan 1')
  })

  it('returns empty string unchanged', () => {
    expect(colorDueDate('')).toBe('')
  })
})
