# cup - ClickUp CLI

> A ClickUp CLI built for AI agents that also works well for humans. Outputs Markdown when piped (optimized for AI context windows), interactive tables when run in a terminal.

[![npm](https://img.shields.io/npm/v/@krodak/clickup-cli)](https://www.npmjs.com/package/@krodak/clickup-cli)
[![node](https://img.shields.io/node/v/@krodak/clickup-cli)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@krodak/clickup-cli)](./LICENSE)
[![CI](https://github.com/krodak/clickup-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/krodak/clickup-cli/actions/workflows/ci.yml)

```bash
npm install -g @krodak/clickup-cli && cup init
```

`cup` is the binary name. The previous `cu` name was retired in v0.21.0 to avoid conflict with the Unix [cu(1)](<https://en.wikipedia.org/wiki/Cu_(Unix_utility)>) utility.

## Talk to your agent

Install the CLI, add the skill file to your agent, and it works with ClickUp. No API knowledge needed.

> **"Read task abc123, do the work, then mark it in review and leave a comment with the commit hash."**

> **"What's my standup? What did I finish, what's in progress, what's overdue?"**

> **"Create a subtask under the initiative for the edge case we found."**

> **"Check my sprint and tell me what's behind schedule."**

> **"Update the description with your findings and flag blockers in a comment."**

The agent reads the skill file, picks the right `cup` commands, and handles everything. You don't need to learn the CLI - the agent does.

## Install

You need Node 22+ and a ClickUp personal API token (`pk_...` from [ClickUp Settings > Apps](https://app.clickup.com/settings/apps)).

<details open>
<summary>&nbsp;<img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" height="18" align="center">&nbsp;<strong>npm</strong></summary>

```bash
npm install -g @krodak/clickup-cli
cup init
```

</details>

<details>
<summary>&nbsp;<img src="https://img.shields.io/badge/Homebrew-FBB040?logo=homebrew&logoColor=black" height="18" align="center">&nbsp;<strong>Homebrew</strong></summary>

```bash
brew tap krodak/tap
brew install clickup-cli
cup init
```

</details>

## Set up your agent

The package includes a [skill file](https://agentskills.io) that teaches agents all available commands and when to use them. All three major coding agents support skills natively:

<details open>
<summary>&nbsp;<img src="https://img.shields.io/badge/Claude_Code-D97757?logo=anthropic&logoColor=white" height="18" align="center">&nbsp;<strong>Claude Code</strong></summary>

**Install as a [plugin](https://docs.anthropic.com/en/docs/claude-code/plugins)** (recommended):

```bash
claude plugin add $(npm root -g)/@krodak/clickup-cli
```

This registers the skill under the `clickup-cli:` namespace. Claude loads it automatically when you work with ClickUp tasks.

**Or install as a personal skill** (no namespace prefix):

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli
mkdir -p ~/.claude/skills/clickup
cp "$SKILL/SKILL.md" ~/.claude/skills/clickup/SKILL.md
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

## API Coverage

[Full command reference with examples and flags](docs/commands.md).

Status: :white_check_mark: implemented | :construction: planned | :no_entry_sign: won't add

### Tasks

| Feature              | Command                 | Status             |
| -------------------- | ----------------------- | ------------------ |
| List my tasks        | `cup tasks`             | :white_check_mark: |
| Get task details     | `cup task <id>`         | :white_check_mark: |
| Create task          | `cup create`            | :white_check_mark: |
| Update task          | `cup update <id>`       | :white_check_mark: |
| Delete task          | `cup delete <id>`       | :white_check_mark: |
| Search tasks         | `cup search <query>`    | :white_check_mark: |
| Open in browser      | `cup open <query>`      | :white_check_mark: |
| List subtasks        | `cup subtasks <id>`     | :white_check_mark: |
| Assign / unassign    | `cup assign <id>`       | :white_check_mark: |
| Duplicate task       | `cup duplicate <id>`    | :construction:     |
| Create from template | `cup create --template` | :construction:     |
| Bulk operations      | `cup bulk`              | :construction:     |

### Dependencies & Relations

| Feature              | Command                    | Status             |
| -------------------- | -------------------------- | ------------------ |
| Add dependency       | `cup depend <id>`          | :white_check_mark: |
| Remove dependency    | `cup depend <id> --remove` | :white_check_mark: |
| Add/remove task link | `cup link <id> <linksTo>`  | :white_check_mark: |

### Multi-list

| Feature          | Command                  | Status             |
| ---------------- | ------------------------ | ------------------ |
| Add task to list | `cup move <id> --add`    | :white_check_mark: |
| Remove from list | `cup move <id> --remove` | :white_check_mark: |

### Sprints & Planning

| Feature                  | Command        | Status             |
| ------------------------ | -------------- | ------------------ |
| Active sprint tasks      | `cup sprint`   | :white_check_mark: |
| List all sprints         | `cup sprints`  | :white_check_mark: |
| Assigned tasks by status | `cup assigned` | :white_check_mark: |
| Standup summary          | `cup summary`  | :white_check_mark: |
| Overdue tasks            | `cup overdue`  | :white_check_mark: |
| Recently updated         | `cup inbox`    | :white_check_mark: |

### Comments

| Feature                  | Command                               | Status             |
| ------------------------ | ------------------------------------- | ------------------ |
| List comments            | `cup comments <id>`                   | :white_check_mark: |
| Post comment             | `cup comment <id>`                    | :white_check_mark: |
| Edit comment             | `cup comment-edit <id>`               | :white_check_mark: |
| Task + comments combined | `cup activity <id>`                   | :white_check_mark: |
| Delete comment           | `cup comment-delete <id>`             | :white_check_mark: |
| Threaded replies         | `cup replies <id>` / `cup reply <id>` | :white_check_mark: |

### Checklists

| Feature          | Command                                   | Status             |
| ---------------- | ----------------------------------------- | ------------------ |
| View checklists  | `cup checklist view <id>`                 | :white_check_mark: |
| Create checklist | `cup checklist create <id> <name>`        | :white_check_mark: |
| Delete checklist | `cup checklist delete <id>`               | :white_check_mark: |
| Add item         | `cup checklist add-item <id> <name>`      | :white_check_mark: |
| Edit item        | `cup checklist edit-item <id> <itemId>`   | :white_check_mark: |
| Delete item      | `cup checklist delete-item <id> <itemId>` | :white_check_mark: |

### Custom Fields

| Feature               | Command                   | Status             |
| --------------------- | ------------------------- | ------------------ |
| Set field value       | `cup field <id> --set`    | :white_check_mark: |
| Remove field value    | `cup field <id> --remove` | :white_check_mark: |
| List available fields | `cup fields <listId>`     | :construction:     |

### Tags

| Feature                 | Command              | Status             |
| ----------------------- | -------------------- | ------------------ |
| Add/remove tag on task  | `cup tag <id>`       | :white_check_mark: |
| List space tags         | `cup tags <spaceId>` | :construction:     |
| Create/delete space tag |                      | :construction:     |

### Time Tracking

| Feature        | Command                        | Status             |
| -------------- | ------------------------------ | ------------------ |
| Start timer    | `cup time start <id>`          | :white_check_mark: |
| Stop timer     | `cup time stop`                | :white_check_mark: |
| Timer status   | `cup time status`              | :white_check_mark: |
| Log time entry | `cup time log <id> <duration>` | :white_check_mark: |
| List entries   | `cup time list`                | :white_check_mark: |
| Update entry   | `cup time update <id>`         | :construction:     |
| Delete entry   | `cup time delete <id>`         | :construction:     |

### Workspace

| Feature      | Command                 | Status             |
| ------------ | ----------------------- | ------------------ |
| List spaces  | `cup spaces`            | :white_check_mark: |
| List lists   | `cup lists <spaceId>`   | :white_check_mark: |
| Check auth   | `cup auth`              | :white_check_mark: |
| List folders | `cup folders <spaceId>` | :construction:     |
| List members | `cup members`           | :construction:     |

### Goals & Key Results

| Feature            | Command     | Status         |
| ------------------ | ----------- | -------------- |
| List goals         | `cup goals` | :construction: |
| Create/update goal |             | :construction: |
| Key results CRUD   |             | :construction: |

### Docs

| Feature           | Command            | Status         |
| ----------------- | ------------------ | -------------- |
| Search docs       | `cup docs <query>` | :construction: |
| View page content | `cup doc <id>`     | :construction: |

### Attachments

| Feature          | Command                    | Status             |
| ---------------- | -------------------------- | ------------------ |
| Upload file      | `cup attach <id> <file>`   | :white_check_mark: |
| List attachments | shown inline in `cup task` | :white_check_mark: |

### :no_entry_sign: Won't add

| Feature               | Why                                                                         |
| --------------------- | --------------------------------------------------------------------------- |
| Webhooks              | Server-side. A CLI can't listen for events.                                 |
| OAuth flow            | `cup init` already handles auth with API tokens.                            |
| Guest/ACL             | Enterprise admin. Not what you reach for in a terminal.                     |
| Chat/DM               | Use the ClickUp app. Chat doesn't belong in a CLI.                          |
| Audit logs            | Enterprise admin.                                                           |
| User/group management | Too destructive for a CLI - removing someone from a workspace is permanent. |
| View CRUD             | Views are visual layouts. Configure them in the UI.                         |

### API Limitations

These features exist in the ClickUp UI but aren't possible through the API:

| Feature                   | Limitation                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Comment attachments       | API only supports task-level attachments (`cup attach`), not files within comments |
| @mention individual users | API provides `--notify-all` but no way to target specific users via @syntax        |
| Comment reactions         | No API endpoint for adding or viewing reactions                                    |
| ClickUp Brain / AI        | No public API                                                                      |
| In-comment checklists     | Only task-level checklists are supported via API                                   |
| Voice notes / Video       | Recording is a UI-only feature                                                     |

### Setup

| Feature           | Command                  | Status             |
| ----------------- | ------------------------ | ------------------ |
| First-time setup  | `cup init`               | :white_check_mark: |
| Get/set config    | `cup config`             | :white_check_mark: |
| Shell completions | `cup completion <shell>` | :white_check_mark: |

## Output Modes

| Context        | Default                     | Override                     |
| -------------- | --------------------------- | ---------------------------- |
| Terminal (TTY) | Interactive tables + picker | `--json`                     |
| Piped (no TTY) | Markdown (optimized for AI) | `--json` or `CU_OUTPUT=json` |

Most commands scope to your assigned tasks by default - keeping output small and relevant for agent context windows.

## Configuration

### Config file

`~/.config/cup/config.json` (or `$XDG_CONFIG_HOME/cup/config.json`):

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

## Custom Task IDs

ClickUp workspaces can configure custom task IDs with a prefix per space (e.g., `PROJ-123`, `DEV-42`). The CLI detects these automatically - any ID matching the `PREFIX-DIGITS` format (uppercase letters, hyphen, digits) is treated as a custom task ID.

All commands that accept task IDs work with both native IDs and custom IDs:

```bash
cup task PROJ-123
cup update DEV-42 --status done
cup comment PROJ-456 -m "Fixed in latest commit"
cup subtasks DEV-100
```

Custom ID resolution uses the `teamId` from your config, which is required (`cup init` sets it up).

**Task links with custom IDs:** The `cup link` command passes both task IDs in a single API request. When both IDs are custom, this works correctly. However, mixing custom and native IDs in a single link command may not work as expected because the ClickUp API applies the `custom_task_ids` flag to all IDs in the request.

## Why a CLI and not MCP?

A CLI + skill file has fewer moving parts. No server process, no protocol layer. The agent already knows how to run shell commands - the skill file teaches it which ones exist. For tool-use with coding agents, CLI + instructions tends to work better than MCP in practice.

## Development

```bash
npm install
npm test          # unit tests (vitest, tests/unit/)
npm run test:e2e  # e2e tests (tests/e2e/, requires CLICKUP_API_TOKEN in .env.test)
npm run build     # tsup -> dist/
```
