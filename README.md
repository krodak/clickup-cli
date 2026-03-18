# cu - ClickUp CLI

> A ClickUp CLI built for AI agents that also works well for humans. Outputs Markdown when piped (optimized for AI context windows), interactive tables when run in a terminal.

[![npm](https://img.shields.io/npm/v/@krodak/clickup-cli)](https://www.npmjs.com/package/@krodak/clickup-cli)
[![node](https://img.shields.io/node/v/@krodak/clickup-cli)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@krodak/clickup-cli)](./LICENSE)
[![CI](https://github.com/krodak/clickup-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/krodak/clickup-cli/actions/workflows/ci.yml)

```bash
npm install -g @krodak/clickup-cli && cu init
```

## Talk to your agent

Install `cu`, install the skill file, and your agent just works with ClickUp. No API knowledge needed.

> **"Read task abc123, do the work, then mark it in review and leave a comment with the commit hash."**

> **"What's my standup? What did I finish, what's in progress, what's overdue?"**

> **"Create a subtask under the initiative for the edge case we found."**

> **"Check my sprint and tell me what's behind schedule."**

> **"Update the description with your findings and flag blockers in a comment."**

The agent reads the skill file, picks the right `cu` commands, and handles everything.

## Setup

You need Node 22+ and a ClickUp personal API token (`pk_...` from [ClickUp Settings > Apps](https://app.clickup.com/settings/apps)).

<details open>
<summary><strong>OpenCode</strong></summary>

**1. Install the CLI**

```bash
npm install -g @krodak/clickup-cli
cu init
```

**2. Install the skill**

```bash
mkdir -p ~/.config/opencode/skills/clickup
cp node_modules/@krodak/clickup-cli/skills/clickup-cli/SKILL.md ~/.config/opencode/skills/clickup/SKILL.md
```

Or if installed globally:

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli/SKILL.md
mkdir -p ~/.config/opencode/skills/clickup
cp "$SKILL" ~/.config/opencode/skills/clickup/SKILL.md
```

</details>

<details>
<summary><strong>Claude Code (CLI)</strong></summary>

**1. Install the CLI**

```bash
npm install -g @krodak/clickup-cli
cu init
```

**2. Install as plugin (recommended)**

The package ships as a Claude Code plugin. After global install:

```bash
claude plugin add $(npm root -g)/@krodak/clickup-cli
```

Or copy the skill manually:

```bash
mkdir -p ~/.claude/skills/clickup
cp $(npm root -g)/@krodak/clickup-cli/skills/clickup-cli/SKILL.md ~/.claude/skills/clickup/SKILL.md
```

Then reference it in your `CLAUDE.md` or project instructions.

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Claude Desktop doesn't run CLI tools directly. Use it alongside a coding agent (Claude Code, OpenCode) that has `cu` installed, or run `cu` commands manually in your terminal.

**Install the CLI:**

```bash
npm install -g @krodak/clickup-cli
cu init
```

</details>

<details>
<summary><strong>Homebrew</strong></summary>

```bash
brew tap krodak/tap
brew install clickup-cli
cu init
```

Then install the skill for your agent (see OpenCode or Claude Code sections above).

</details>

<details>
<summary><strong>Other agents (Codex, custom)</strong></summary>

**1. Install the CLI**

```bash
npm install -g @krodak/clickup-cli
cu init
```

**2. Add the skill to your agent**

Copy the contents of `skills/clickup-cli/SKILL.md` into your agent's system prompt or project instructions. It's a standalone markdown document that teaches the agent all available commands.

</details>

## Commands

31 commands across task management, sprint tracking, comments, and workspace navigation. [Full reference with examples and flags](docs/commands.md).

### Read

| Command              | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `cu tasks`           | List my tasks (filter by status, name, type, list, space) |
| `cu task <id>`       | Task details with custom fields and checklists            |
| `cu subtasks <id>`   | List subtasks of a task                                   |
| `cu sprint`          | My tasks in the active sprint (auto-detected)             |
| `cu sprints`         | List all sprints                                          |
| `cu assigned`        | All my tasks grouped by status                            |
| `cu inbox`           | Recently updated tasks                                    |
| `cu search <query>`  | Search my tasks by name                                   |
| `cu comments <id>`   | Comments on a task                                        |
| `cu activity <id>`   | Task details + comments combined                          |
| `cu summary`         | Standup helper: completed, in progress, overdue           |
| `cu overdue`         | Tasks past their due date                                 |
| `cu spaces`          | List workspace spaces                                     |
| `cu lists <spaceId>` | Lists in a space                                          |
| `cu open <query>`    | Open task in browser                                      |
| `cu auth`            | Check authentication                                      |

### Write

| Command                | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `cu update <id>`       | Update task fields (status, name, priority, etc.) |
| `cu create`            | Create a task or subtask                          |
| `cu delete <id>`       | Delete a task (requires confirmation)             |
| `cu comment <id>`      | Post a comment                                    |
| `cu comment-edit <id>` | Edit an existing comment                          |
| `cu assign <id>`       | Assign/unassign users                             |
| `cu field <id>`        | Set/remove custom field values                    |
| `cu tag <id>`          | Add/remove tags                                   |
| `cu checklist`         | Manage checklists (view, create, delete, items)   |
| `cu depend <id>`       | Add/remove task dependencies                      |
| `cu move <id>`         | Add/remove task from lists                        |

### Config

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `cu init`               | First-time setup                  |
| `cu config`             | Get/set config values             |
| `cu completion <shell>` | Shell completions (bash/zsh/fish) |

## Output Modes

| Context        | Default                     | Override                     |
| -------------- | --------------------------- | ---------------------------- |
| Terminal (TTY) | Interactive tables + picker | `--json`                     |
| Piped (no TTY) | Markdown (optimized for AI) | `--json` or `CU_OUTPUT=json` |

Most commands scope to your assigned tasks by default - keeping output small and relevant for agent context windows.

## Configuration

### Config file

`~/.config/cu/config.json` (or `$XDG_CONFIG_HOME/cu/config.json`):

```json
{
  "apiToken": "pk_...",
  "teamId": "12345678"
}
```

### Environment variables

Environment variables override config file values:

| Variable       | Description                                                       |
| -------------- | ----------------------------------------------------------------- |
| `CU_API_TOKEN` | ClickUp personal API token (`pk_`)                                |
| `CU_TEAM_ID`   | Workspace (team) ID                                               |
| `CU_OUTPUT`    | Set to `json` to force JSON output when piped (default: markdown) |

When both are set, the config file is not required. Useful for CI/CD and containerized agents.

## Why a CLI and not MCP?

A CLI + skill file has fewer moving parts. No server process, no protocol layer. The agent already knows how to run shell commands - the skill file teaches it which ones exist. For tool-use with coding agents, CLI + instructions tends to work better than MCP in practice.

## Development

```bash
npm install
npm test          # unit tests (vitest, tests/unit/)
npm run test:e2e  # e2e tests (tests/e2e/, requires CLICKUP_API_TOKEN in .env.test)
npm run build     # tsup -> dist/
```
