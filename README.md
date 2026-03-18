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

| Feature              | Command                | Status             |
| -------------------- | ---------------------- | ------------------ |
| List my tasks        | `cu tasks`             | :white_check_mark: |
| Get task details     | `cu task <id>`         | :white_check_mark: |
| Create task          | `cu create`            | :white_check_mark: |
| Update task          | `cu update <id>`       | :white_check_mark: |
| Delete task          | `cu delete <id>`       | :white_check_mark: |
| Search tasks         | `cu search <query>`    | :white_check_mark: |
| Open in browser      | `cu open <query>`      | :white_check_mark: |
| List subtasks        | `cu subtasks <id>`     | :white_check_mark: |
| Assign / unassign    | `cu assign <id>`       | :white_check_mark: |
| Duplicate task       | `cu duplicate <id>`    | :construction:     |
| Create from template | `cu create --template` | :construction:     |
| Bulk operations      | `cu bulk`              | :construction:     |

### Dependencies & Relations

| Feature              | Command                   | Status             |
| -------------------- | ------------------------- | ------------------ |
| Add dependency       | `cu depend <id>`          | :white_check_mark: |
| Remove dependency    | `cu depend <id> --remove` | :white_check_mark: |
| Add/remove task link | `cu link <id> <linksTo>`  | :white_check_mark: |

### Multi-list

| Feature          | Command                 | Status             |
| ---------------- | ----------------------- | ------------------ |
| Add task to list | `cu move <id> --add`    | :white_check_mark: |
| Remove from list | `cu move <id> --remove` | :white_check_mark: |

### Sprints & Planning

| Feature                  | Command       | Status             |
| ------------------------ | ------------- | ------------------ |
| Active sprint tasks      | `cu sprint`   | :white_check_mark: |
| List all sprints         | `cu sprints`  | :white_check_mark: |
| Assigned tasks by status | `cu assigned` | :white_check_mark: |
| Standup summary          | `cu summary`  | :white_check_mark: |
| Overdue tasks            | `cu overdue`  | :white_check_mark: |
| Recently updated         | `cu inbox`    | :white_check_mark: |

### Comments

| Feature                  | Command                             | Status             |
| ------------------------ | ----------------------------------- | ------------------ |
| List comments            | `cu comments <id>`                  | :white_check_mark: |
| Post comment             | `cu comment <id>`                   | :white_check_mark: |
| Edit comment             | `cu comment-edit <id>`              | :white_check_mark: |
| Task + comments combined | `cu activity <id>`                  | :white_check_mark: |
| Delete comment           | `cu comment-delete <id>`            | :white_check_mark: |
| Threaded replies         | `cu replies <id>` / `cu reply <id>` | :white_check_mark: |

### Checklists

| Feature          | Command                                  | Status             |
| ---------------- | ---------------------------------------- | ------------------ |
| View checklists  | `cu checklist view <id>`                 | :white_check_mark: |
| Create checklist | `cu checklist create <id> <name>`        | :white_check_mark: |
| Delete checklist | `cu checklist delete <id>`               | :white_check_mark: |
| Add item         | `cu checklist add-item <id> <name>`      | :white_check_mark: |
| Edit item        | `cu checklist edit-item <id> <itemId>`   | :white_check_mark: |
| Delete item      | `cu checklist delete-item <id> <itemId>` | :white_check_mark: |

### Custom Fields

| Feature               | Command                  | Status             |
| --------------------- | ------------------------ | ------------------ |
| Set field value       | `cu field <id> --set`    | :white_check_mark: |
| Remove field value    | `cu field <id> --remove` | :white_check_mark: |
| List available fields | `cu fields <listId>`     | :construction:     |

### Tags

| Feature                 | Command             | Status             |
| ----------------------- | ------------------- | ------------------ |
| Add/remove tag on task  | `cu tag <id>`       | :white_check_mark: |
| List space tags         | `cu tags <spaceId>` | :construction:     |
| Create/delete space tag |                     | :construction:     |

### Time Tracking

| Feature        | Command                       | Status             |
| -------------- | ----------------------------- | ------------------ |
| Start timer    | `cu time start <id>`          | :white_check_mark: |
| Stop timer     | `cu time stop`                | :white_check_mark: |
| Timer status   | `cu time status`              | :white_check_mark: |
| Log time entry | `cu time log <id> <duration>` | :white_check_mark: |
| List entries   | `cu time list`                | :white_check_mark: |
| Update entry   | `cu time update <id>`         | :construction:     |
| Delete entry   | `cu time delete <id>`         | :construction:     |

### Workspace

| Feature      | Command                | Status             |
| ------------ | ---------------------- | ------------------ |
| List spaces  | `cu spaces`            | :white_check_mark: |
| List lists   | `cu lists <spaceId>`   | :white_check_mark: |
| Check auth   | `cu auth`              | :white_check_mark: |
| List folders | `cu folders <spaceId>` | :construction:     |
| List members | `cu members`           | :construction:     |

### Goals & Key Results

| Feature            | Command    | Status         |
| ------------------ | ---------- | -------------- |
| List goals         | `cu goals` | :construction: |
| Create/update goal |            | :construction: |
| Key results CRUD   |            | :construction: |

### Docs

| Feature           | Command           | Status         |
| ----------------- | ----------------- | -------------- |
| Search docs       | `cu docs <query>` | :construction: |
| View page content | `cu doc <id>`     | :construction: |

### Attachments

| Feature          | Command                 | Status         |
| ---------------- | ----------------------- | -------------- |
| Upload file      | `cu attach <id> <file>` | :construction: |
| List attachments |                         | :construction: |

### :no_entry_sign: Won't add

| Feature               | Why                                                                         |
| --------------------- | --------------------------------------------------------------------------- |
| Webhooks              | Server-side. A CLI can't listen for events.                                 |
| OAuth flow            | `cu init` already handles auth with API tokens.                             |
| Guest/ACL             | Enterprise admin. Not what you reach for in a terminal.                     |
| Chat/DM               | Use the ClickUp app. Chat doesn't belong in a CLI.                          |
| Audit logs            | Enterprise admin.                                                           |
| User/group management | Too destructive for a CLI - removing someone from a workspace is permanent. |
| View CRUD             | Views are visual layouts. Configure them in the UI.                         |

### Setup

| Feature           | Command                 | Status             |
| ----------------- | ----------------------- | ------------------ |
| First-time setup  | `cu init`               | :white_check_mark: |
| Get/set config    | `cu config`             | :white_check_mark: |
| Shell completions | `cu completion <shell>` | :white_check_mark: |

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
