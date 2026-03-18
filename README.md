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

The package includes a [skill file](https://agentskills.io) that teaches agents all available commands and when to use them. All three major coding agents support skills natively:

<details open>
<summary>&nbsp;<img src="https://img.shields.io/badge/Claude_Code-D97757?logo=anthropic&logoColor=white" height="18" align="center">&nbsp;<strong>Claude Code</strong></summary>

Claude Code [skills](https://docs.anthropic.com/en/docs/claude-code/skills) are markdown files with YAML frontmatter. Claude loads them automatically when relevant.

**Install as a personal skill** (available across all your projects):

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli
mkdir -p ~/.claude/skills/clickup
cp "$SKILL/SKILL.md" ~/.claude/skills/clickup/SKILL.md
```

**Or install as a project skill** (available to everyone on the project):

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli
mkdir -p .claude/skills/clickup
cp "$SKILL/SKILL.md" .claude/skills/clickup/SKILL.md
```

</details>

<details>
<summary>&nbsp;<img src="https://img.shields.io/badge/Codex-412991?logo=openai&logoColor=white" height="18" align="center">&nbsp;<strong>Codex</strong></summary>

Codex supports [agent skills](https://developers.openai.com/codex/skills) across CLI, IDE extension, and web. Skills use the same `SKILL.md` format with YAML frontmatter.

**Install as a user skill** (available across all your projects):

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli
mkdir -p ~/.agents/skills/clickup
cp "$SKILL/SKILL.md" ~/.agents/skills/clickup/SKILL.md
```

**Or install as a project skill** (checked into your repo):

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli
mkdir -p .agents/skills/clickup
cp "$SKILL/SKILL.md" .agents/skills/clickup/SKILL.md
```

You can also use the built-in installer: `$skill-installer clickup`

</details>

<details>
<summary>&nbsp;<img src="https://img.shields.io/badge/OpenCode-24292e?logoColor=white" height="18" align="center">&nbsp;<strong>OpenCode</strong></summary>

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli
mkdir -p ~/.config/opencode/skills/clickup
cp "$SKILL/SKILL.md" ~/.config/opencode/skills/clickup/SKILL.md
```

</details>

<details>
<summary>&nbsp;<strong>Other agents</strong></summary>

The skill file follows the [Agent Skills](https://agentskills.io) open standard. Copy `skills/clickup-cli/SKILL.md` into your agent's skill directory, system prompt, or `AGENTS.md`.

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
