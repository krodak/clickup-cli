import { describe, it, expect } from 'vitest'
import { generateCompletion } from '../../../src/commands/completion.js'

const ALL_COMMANDS = [
  'init',
  'tasks',
  'initiatives',
  'task',
  'update',
  'create',
  'sprint',
  'subtasks',
  'comment',
  'comments',
  'lists',
  'spaces',
  'inbox',
  'assigned',
  'open',
  'summary',
  'overdue',
  'assign',
  'config',
  'completion',
]

describe('generateCompletion', () => {
  describe('bash', () => {
    it('returns a non-empty string', () => {
      const result = generateCompletion('bash')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('contains all command names', () => {
      const result = generateCompletion('bash')
      for (const cmd of ALL_COMMANDS) {
        expect(result).toContain(cmd)
      }
    })

    it('contains key flags', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('--status')
      expect(result).toContain('--json')
      expect(result).toContain('--list')
      expect(result).toContain('--name')
      expect(result).toContain('--priority')
    })

    it('contains priority values', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('urgent')
      expect(result).toContain('high')
      expect(result).toContain('normal')
      expect(result).toContain('low')
    })

    it('contains the complete function registration', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('complete -F')
      expect(result).toContain('cu')
    })

    it('handles missing _init_completion with fallback', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('_init_completion')
      expect(result).toContain('COMP_WORDS')
    })
  })

  describe('zsh', () => {
    it('returns a non-empty string', () => {
      const result = generateCompletion('zsh')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('contains all command names', () => {
      const result = generateCompletion('zsh')
      for (const cmd of ALL_COMMANDS) {
        expect(result).toContain(cmd)
      }
    })

    it('contains key flags', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('--status')
      expect(result).toContain('--json')
      expect(result).toContain('--list')
      expect(result).toContain('--name')
      expect(result).toContain('--priority')
    })

    it('contains compdef directive', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('#compdef cu')
    })

    it('contains status suggestions', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('open')
      expect(result).toContain('in progress')
      expect(result).toContain('done')
    })
  })

  describe('fish', () => {
    it('returns a non-empty string', () => {
      const result = generateCompletion('fish')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('contains all command names', () => {
      const result = generateCompletion('fish')
      for (const cmd of ALL_COMMANDS) {
        expect(result).toContain(cmd)
      }
    })

    it('contains key flags', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('-l status')
      expect(result).toContain('-l json')
      expect(result).toContain('-l name')
      expect(result).toContain('-l priority')
    })

    it('disables file completions', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('complete -c cu -f')
    })

    it('uses __fish_use_subcommand for top-level commands', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('__fish_use_subcommand')
    })

    it('uses __fish_seen_subcommand_from for subcommand flags', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('__fish_seen_subcommand_from')
    })
  })

  describe('unknown shell', () => {
    it('throws an error for unsupported shell', () => {
      expect(() => generateCompletion('powershell')).toThrow()
    })

    it('includes the shell name in the error message', () => {
      expect(() => generateCompletion('tcsh')).toThrow('tcsh')
    })
  })

  describe('config subcommand completions', () => {
    it('bash includes config subcommands', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('get')
      expect(result).toContain('set')
      expect(result).toContain('path')
      expect(result).toContain('apiToken')
      expect(result).toContain('teamId')
    })

    it('zsh includes config subcommands', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('get')
      expect(result).toContain('set')
      expect(result).toContain('path')
      expect(result).toContain('apiToken')
      expect(result).toContain('teamId')
    })

    it('fish includes config subcommands', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('apiToken')
      expect(result).toContain('teamId')
    })
  })

  describe('completion subcommand completions', () => {
    it('bash includes shell types', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('bash')
      expect(result).toContain('zsh')
      expect(result).toContain('fish')
    })

    it('zsh includes shell types', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('bash')
      expect(result).toContain('zsh')
      expect(result).toContain('fish')
    })

    it('fish includes shell types', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('bash')
      expect(result).toContain('zsh')
      expect(result).toContain('fish')
    })
  })
})
