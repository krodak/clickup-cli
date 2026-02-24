import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClickUpClient } from '../../../src/api.js'

describe('listSpaces', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('prints table with header in TTY mode', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Engineering' },
      { id: 's2', name: 'Design' },
    ])

    const output: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      output.push(args.map(String).join(' '))
    })

    const outputModule = await import('../../../src/output.js')
    vi.spyOn(outputModule, 'isTTY').mockReturnValue(true)

    const { listSpaces } = await import('../../../src/commands/spaces.js')
    await listSpaces({ apiToken: 'pk_test', teamId: 'team1' }, {})

    const joined = output.join('\n')
    expect(joined).toContain('ID')
    expect(joined).toContain('NAME')
    expect(joined).toContain('s1')
    expect(joined).toContain('Engineering')
    expect(joined).toContain('s2')
    expect(joined).toContain('Design')
  })

  it('prints JSON when --json is set', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Engineering' },
    ])

    const output: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      output.push(args.map(String).join(' '))
    })

    const { listSpaces } = await import('../../../src/commands/spaces.js')
    await listSpaces({ apiToken: 'pk_test', teamId: 'team1' }, { json: true })

    const parsed = JSON.parse(output.join(''))
    expect(parsed).toEqual([{ id: 's1', name: 'Engineering' }])
  })

  it('filters spaces by name', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Engineering' },
      { id: 's2', name: 'Design' },
    ])

    const output: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      output.push(args.map(String).join(' '))
    })

    const { listSpaces } = await import('../../../src/commands/spaces.js')
    await listSpaces({ apiToken: 'pk_test', teamId: 'team1' }, { name: 'eng', json: true })

    const parsed = JSON.parse(output.join('')) as Array<{ id: string; name: string }>
    expect(parsed).toHaveLength(1)
    expect(parsed[0].name).toBe('Engineering')
  })
})
