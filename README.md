# cu - ClickUp CLI

> A ClickUp CLI built for AI agents that also works well for humans. Outputs Markdown when piped (optimized for AI context windows), interactive tables when run in a terminal.

[![npm](https://img.shields.io/npm/v/@krodak/clickup-cli)](https://www.npmjs.com/package/@krodak/clickup-cli)
[![node](https://img.shields.io/node/v/@krodak/clickup-cli)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@krodak/clickup-cli)](./LICENSE)
[![CI](https://github.com/krodak/clickup-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/krodak/clickup-cli/actions/workflows/ci.yml)

```bash
npm install -g @krodak/clickup-cli && cu init   # or: brew tap krodak/tap && brew install clickup-cli
```

## Talk to your agent

Install the CLI, add the skill file to your agent, and it works with ClickUp. No API knowledge needed.

> **"Read task abc123, do the work, then mark it in review and leave a comment with the commit hash."**

> **"What's my standup? What did I finish, what's in progress, what's overdue?"**

> **"Create a subtask under the initiative for the edge case we found."**

> **"Check my sprint and tell me what's behind schedule."**

> **"Update the description with your findings and flag blockers in a comment."**

The agent reads the skill file, picks the right `cu` commands, and handles everything. You don't need to learn the CLI - the agent does.

## Install

You need Node 22+ and a ClickUp personal API token (`pk_...` from [ClickUp Settings > Apps](https://app.clickup.com/settings/apps)).

<details open>
<summary>&nbsp;<img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" height="18" align="center">&nbsp;<strong>npm</strong></summary>

```bash
npm install -g @krodak/clickup-cli
cu init
```

</details>

<details>
<summary>&nbsp;<img src="https://img.shields.io/badge/Homebrew-FBB040?logo=homebrew&logoColor=black" height="18" align="center">&nbsp;<strong>Homebrew</strong></summary>

```bash
brew tap krodak/tap
brew install clickup-cli
cu init
```

</details>

## Set up your agent

The repo includes a skill file at `skills/clickup-cli/SKILL.md` that teaches agents all available commands and when to use them. Install it for your agent:

<details open>
<summary>&nbsp;<img src="https://img.shields.io/badge/OpenCode-24292e?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxwb2x5bGluZSBwb2ludHM9IjE2IDEyIDIwIDEyIDIwIDE2Ii8+PHBhdGggZD0iTTQgMjBWMTBhOCA4IDAgMCAxIDE2IDB2MTAiLz48L3N2Zz4=&logoColor=white" height="18" align="center">&nbsp;<strong>OpenCode</strong></summary>

```bash
mkdir -p ~/.config/opencode/skills/clickup
cp $(npm root -g)/@krodak/clickup-cli/skills/clickup-cli/SKILL.md ~/.config/opencode/skills/clickup/SKILL.md
```

</details>

<details>
<summary>&nbsp;<img src="https://img.shields.io/badge/Claude_Code-D97757?logo=anthropic&logoColor=white" height="18" align="center">&nbsp;<strong>Claude Code</strong></summary>

```bash
mkdir -p ~/.claude/skills/clickup
cp $(npm root -g)/@krodak/clickup-cli/skills/clickup-cli/SKILL.md ~/.claude/skills/clickup/SKILL.md
```

Then reference it in your `CLAUDE.md` or project instructions.

</details>

<details>
<summary>&nbsp;<img src="https://img.shields.io/badge/Codex_CLI-412991?logo=openai&logoColor=white" height="18" align="center">&nbsp;<strong>Codex CLI</strong></summary>

Codex CLI reads `AGENTS.md` files from your repo. Add the skill content to your project's `AGENTS.md`:

```bash
cat $(npm root -g)/@krodak/clickup-cli/skills/clickup-cli/SKILL.md >> AGENTS.md
```

Or reference it from your existing `AGENTS.md`:

```markdown
## ClickUp

See node_modules/@krodak/clickup-cli/skills/clickup-cli/SKILL.md for cu CLI reference.
```

</details>

<details>
<summary>&nbsp;<img src="https://img.shields.io/badge/Codex_(ChatGPT)-412991?logo=openai&logoColor=white" height="18" align="center">&nbsp;<strong>Codex in ChatGPT</strong></summary>

Codex in ChatGPT runs tasks in cloud sandboxes preloaded with your repo. To use `cu`:

1. Add an `AGENTS.md` file to your repo root with the contents of `skills/clickup-cli/SKILL.md`
2. Add a setup script that installs the CLI: `npm install -g @krodak/clickup-cli`
3. Set `CU_API_TOKEN` and `CU_TEAM_ID` as environment variables in your Codex environment

Codex will read the AGENTS.md and use `cu` commands when working with ClickUp tasks.

</details>

<details>
<summary>&nbsp;<strong>Other agents</strong></summary>

Copy `skills/clickup-cli/SKILL.md` into your agent's system prompt or project instructions. It's a standalone markdown document that teaches the agent all available commands.

</details>

## Commands

36 commands total. [Full reference with examples and flags](docs/commands.md).

### Tasks

| Command               | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `cu tasks`            | List my tasks (filter by status, name, type, list, space)   |
| `cu task <id>`        | Task details with custom fields and checklists              |
| `cu subtasks <id>`    | List subtasks of a task                                     |
| `cu create`           | Create a task or subtask                                    |
| `cu update <id>`      | Update task fields (status, name, priority, assignee, etc.) |
| `cu delete <id>`      | Delete a task (requires confirmation)                       |
| `cu assign <id>`      | Assign/unassign users                                       |
| `cu depend <id>`      | Add/remove task dependencies                                |
| `cu move <id>`        | Add/remove task from lists                                  |
| `cu open <query>`     | Open task in browser by ID or name                          |
| `cu search <query>`   | Search my tasks by name                                     |
| _`cu duplicate <id>`_ | _Copy a task - coming soon_                                 |
| _`cu bulk`_           | _Bulk task operations - coming soon_                        |

### Sprints & Planning

| Command       | Description                                     |
| ------------- | ----------------------------------------------- |
| `cu sprint`   | My tasks in the active sprint (auto-detected)   |
| `cu sprints`  | List all sprints                                |
| `cu assigned` | All my tasks grouped by status                  |
| `cu summary`  | Standup helper: completed, in progress, overdue |
| `cu overdue`  | Tasks past their due date                       |
| `cu inbox`    | Recently updated tasks                          |

### Comments

| Command                    | Description                      |
| -------------------------- | -------------------------------- |
| `cu comment <id>`          | Post a comment on a task         |
| `cu comments <id>`         | List comments on a task          |
| `cu comment-edit <id>`     | Edit an existing comment         |
| `cu activity <id>`         | Task details + comments combined |
| _`cu comment-delete <id>`_ | _Delete a comment - coming soon_ |

### Custom Fields

| Command                | Description                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `cu field <id>`        | Set/remove custom field values (text, number, dropdown, date, checkbox, url, email) |
| _`cu fields <listId>`_ | _List available custom fields for a list - coming soon_                             |

### Checklists

| Command                                  | Description                                      |
| ---------------------------------------- | ------------------------------------------------ |
| `cu checklist view <id>`                 | View all checklists on a task                    |
| `cu checklist create <id> <name>`        | Create a checklist                               |
| `cu checklist delete <id>`               | Delete a checklist                               |
| `cu checklist add-item <id> <name>`      | Add item to a checklist                          |
| `cu checklist edit-item <id> <itemId>`   | Edit a checklist item (name, resolved, assignee) |
| `cu checklist delete-item <id> <itemId>` | Delete a checklist item                          |

### Tags

| Command               | Description                                         |
| --------------------- | --------------------------------------------------- |
| `cu tag <id>`         | Add/remove tags on a task                           |
| _`cu tags <spaceId>`_ | _List/create/delete space-level tags - coming soon_ |

### Workspace

| Command                  | Description                               |
| ------------------------ | ----------------------------------------- |
| `cu spaces`              | List workspace spaces                     |
| `cu lists <spaceId>`     | Lists in a space (including folder lists) |
| `cu auth`                | Check authentication status               |
| _`cu folders <spaceId>`_ | _List folders in a space - coming soon_   |
| _`cu members`_           | _List workspace members - coming soon_    |

### Time Tracking

| Command                       | Description                                     |
| ----------------------------- | ----------------------------------------------- |
| `cu time start <id>`          | Start tracking time on a task                   |
| `cu time stop`                | Stop the running timer                          |
| `cu time status`              | Show the currently running timer                |
| `cu time log <id> <duration>` | Log a manual time entry (e.g. "2h", "30m")      |
| `cu time list`                | List recent time entries (default: last 7 days) |

### Setup

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `cu init`               | First-time setup wizard           |
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
