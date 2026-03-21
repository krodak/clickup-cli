import { describe, it, expect } from 'vitest'
import { generateCompletion } from '../../../src/commands/completion.js'

const ALL_COMMANDS = [
  'init',
  'tasks',
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
  'goal-delete',
  'key-result-delete',
  'doc-delete',
  'doc-page-delete',
  'tag-update',
  'task-types',
  'templates',
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
      expect(result).toContain('cup')
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
      expect(result).toContain('#compdef cup')
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
      expect(result).toContain('complete -c cup -f')
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

  describe('custom binary name', () => {
    it('bash uses the provided name for function and registration', () => {
      const result = generateCompletion('bash', 'clickup')
      expect(result).toContain('_clickup_completions()')
      expect(result).toContain('complete -F _clickup_completions clickup')
      expect(result).not.toContain('_cup_completions')
    })

    it('zsh uses the provided name for compdef and function', () => {
      const result = generateCompletion('zsh', 'clickup')
      expect(result).toContain('#compdef clickup')
      expect(result).toContain('_clickup()')
      expect(result).not.toContain('#compdef cup\n')
    })

    it('fish uses the provided name for complete commands', () => {
      const result = generateCompletion('fish', 'clickup')
      expect(result).toContain('complete -c clickup -f')
      expect(result).toContain('complete -c clickup -n __fish_use_subcommand')
      expect(result).not.toContain('complete -c cup ')
    })

    it('defaults to cup when name is not provided', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('_cup_completions()')
      expect(result).toContain('complete -F _cup_completions cup')
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

  describe('time subcommand completions', () => {
    it('bash includes update and delete subcommands', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('start stop status log list update delete')
    })

    it('zsh includes update and delete subcommands', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain("'update:Update a time entry'")
      expect(result).toContain("'delete:Delete a time entry'")
    })

    it('fish includes update and delete subcommands', () => {
      const result = generateCompletion('fish')
      expect(result).toContain("-a update -d 'Update a time entry'")
      expect(result).toContain("-a delete -d 'Delete a time entry'")
    })
  })

  describe('new command completions', () => {
    it('bash includes new commands', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('goal-delete')
      expect(result).toContain('key-result-delete')
      expect(result).toContain('doc-delete')
      expect(result).toContain('doc-page-delete')
      expect(result).toContain('tag-update')
      expect(result).toContain('task-types')
      expect(result).toContain('templates')
    })

    it('bash includes --template in create', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('--template')
    })

    it('zsh includes new commands', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('goal-delete')
      expect(result).toContain('key-result-delete')
      expect(result).toContain('doc-delete')
      expect(result).toContain('doc-page-delete')
      expect(result).toContain('tag-update')
      expect(result).toContain('task-types')
      expect(result).toContain('templates')
    })

    it('fish includes new commands', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('goal-delete')
      expect(result).toContain('key-result-delete')
      expect(result).toContain('doc-delete')
      expect(result).toContain('doc-page-delete')
      expect(result).toContain('tag-update')
      expect(result).toContain('task-types')
      expect(result).toContain('templates')
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
