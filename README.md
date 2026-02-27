# cu - ClickUp CLI

A ClickUp CLI built for AI agents that also works well for humans. Outputs Markdown when piped (optimized for AI context windows), interactive tables when run in a terminal.

## Quick start

```bash
npm install -g @krodak/clickup-cli   # or: brew tap krodak/tap && brew install clickup-cli
cu init                               # walks you through API token + workspace setup
```

You need Node 22+ and a ClickUp personal API token (`pk_...` from https://app.clickup.com/settings/apps).

## Using with AI agents

This is the primary use case. Install the tool, install the skill file, and your agent knows how to work with ClickUp.

### 1. Install the skill

The repo includes a skill file at `skill/SKILL.md` that teaches agents all available commands and when to use them.

**Claude Code:**

```bash
mkdir -p ~/.claude/skills/clickup
cp skill/SKILL.md ~/.claude/skills/clickup/SKILL.md
```

Then reference it in your `CLAUDE.md` or project instructions.

**OpenCode:**

```bash
mkdir -p ~/.config/opencode/skills/clickup
cp skill/SKILL.md ~/.config/opencode/skills/clickup/SKILL.md
```

**Codex / other agents:**

Copy the contents of `skill/SKILL.md` into your system prompt or project instructions. It's a standalone markdown document.

### 2. Talk to your agent

Once the skill is installed, you just tell the agent what you need in plain language. It figures out which `cu` commands to run.

```
"Read the description of task <id>, do the work, then mark it in review and leave a comment with the commit hash."

"Check all subtasks under initiative <id> and improve their descriptions based on what's in the codebase."

"What's my standup summary? What did I finish yesterday, what's in progress, what's overdue?"

"Do exploratory work for task <id>, update the description with your findings, and flag blockers in a comment."

"Create a subtask under <id> for the edge case we just found."

"Check my sprint and tell me what's overdue."
```

You don't need to learn the CLI commands yourself. The agent handles it.

### Why a CLI and not MCP?

A CLI + skill file has fewer moving parts. No extra server process, no protocol layer. The agent already knows how to run shell commands - the skill file just teaches it which ones exist. This matches what Peter Steinberger and the OpenClaw project have found: for tool-use with coding agents, CLI + instructions tends to work better than MCP in practice.

### Scoped output

Most commands return only your tasks by default. `cu tasks`, `cu sprint`, `cu overdue`, `cu summary` all scope to what's assigned to you. `cu spaces --my` filters to spaces where you have tasks. This keeps output small and relevant - important when it's going into an agent's context window.

## Using from the terminal

When you run `cu` in a terminal directly, you get an interactive mode with tables and a task picker.

```bash
cu tasks                          # interactive table with checkbox picker
cu sprint                         # your sprint tasks, auto-detected
cu summary                        # standup helper: completed / in progress / overdue
cu overdue                        # tasks past their due date
cu open "login bug"               # fuzzy search, opens in browser
cu update abc123 -s "done"        # update status
cu assign abc123 --to me          # assign yourself
```

Pass `--json` to any read command to force JSON output instead of the default format.

When output is piped (no TTY), all commands output **Markdown** by default - optimized for AI agent context windows. Pass `--json` to any command for JSON output. Set `CU_OUTPUT=json` environment variable to always get JSON when piped.

## Commands

20 commands total. All support `--help` for full flag details.

### `cu init`

First-time setup. Prompts for your API token, verifies it, auto-detects your workspace, and writes `~/.config/cu/config.json`.

```bash
cu init
```

### `cu tasks`

List tasks assigned to me.

```bash
cu tasks
cu tasks --status "in progress"
cu tasks --name "login"
cu tasks --list <listId>
cu tasks --space <spaceId>
cu tasks --json
```

### `cu initiatives`

List initiatives assigned to me.

```bash
cu initiatives
cu initiatives --status "to do"
cu initiatives --name "auth"
cu initiatives --list <listId>
cu initiatives --space <spaceId>
cu initiatives --json
```

### `cu sprint`

List my tasks in the currently active sprint (auto-detected from sprint folder date ranges).

```bash
cu sprint
cu sprint --status "in progress"
cu sprint --json
```

### `cu assigned`

All tasks assigned to me, grouped by pipeline stage (code review, in progress, to do, etc.).

```bash
cu assigned
cu assigned --include-closed
cu assigned --json
```

### `cu inbox`

Tasks assigned to me that were recently updated, grouped by time period (today, yesterday, last 7 days, etc.). Default lookback is 30 days.

```bash
cu inbox
cu inbox --days 7
cu inbox --json
```

### `cu task <id>`

Get task details. Pretty summary in terminal, JSON when piped.

```bash
cu task abc123
cu task abc123 --json
```

**Note:** When piped, `cu task` outputs a structured Markdown summary of the task. For the full raw API response with all fields (custom fields, checklists, etc.), use `--json`.

### `cu subtasks <id>`

List subtasks of a task or initiative.

```bash
cu subtasks abc123
cu subtasks abc123 --json
```

### `cu update <id>`

Update a task. Provide at least one option.

```bash
cu update abc123 -s "in progress"
cu update abc123 -n "New task name"
cu update abc123 -d "Updated description with **markdown**"
cu update abc123 --priority high
cu update abc123 --due-date 2025-03-15
cu update abc123 --assignee 12345
cu update abc123 -n "New name" -s "done" --priority urgent
```

| Flag                       | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `-n, --name <text>`        | New task name                                        |
| `-d, --description <text>` | New description (markdown supported)                 |
| `-s, --status <status>`    | New status (e.g. `"in progress"`, `"done"`)          |
| `--priority <level>`       | Priority: `urgent`, `high`, `normal`, `low` (or 1-4) |
| `--due-date <date>`        | Due date (`YYYY-MM-DD`)                              |
| `--assignee <userId>`      | Add assignee by numeric user ID                      |

### `cu create`

Create a new task. If `--parent` is given, list is auto-detected from the parent task.

```bash
cu create -n "Fix login bug" -l <listId>
cu create -n "Subtask name" -p <parentTaskId>    # --list auto-detected
cu create -n "Task" -l <listId> -d "desc" -s "open"
cu create -n "Task" -l <listId> --priority high --due-date 2025-06-01
cu create -n "Task" -l <listId> --assignee 12345 --tags "bug,frontend"
```

| Flag                       | Required         | Description                                          |
| -------------------------- | ---------------- | ---------------------------------------------------- |
| `-n, --name <name>`        | yes              | Task name                                            |
| `-l, --list <listId>`      | if no `--parent` | Target list ID                                       |
| `-p, --parent <taskId>`    | no               | Parent task (list auto-detected)                     |
| `-d, --description <text>` | no               | Description (markdown)                               |
| `-s, --status <status>`    | no               | Initial status                                       |
| `--priority <level>`       | no               | Priority: `urgent`, `high`, `normal`, `low` (or 1-4) |
| `--due-date <date>`        | no               | Due date (`YYYY-MM-DD`)                              |
| `--assignee <userId>`      | no               | Assignee by numeric user ID                          |
| `--tags <tags>`            | no               | Comma-separated tag names                            |

### `cu comment <id>`

Post a comment on a task.

```bash
cu comment abc123 -m "Addressed in PR #42"
```

### `cu comments <id>`

List comments on a task. Formatted view in terminal, JSON when piped.

```bash
cu comments abc123
cu comments abc123 --json
```

### `cu lists <spaceId>`

List all lists in a space, including lists inside folders. Useful for discovering list IDs needed by `--list` filter and `cu create -l`.

```bash
cu lists <spaceId>
cu lists <spaceId> --name "sprint"
cu lists <spaceId> --json
```

| Flag               | Description                        |
| ------------------ | ---------------------------------- |
| `--name <partial>` | Filter lists by partial name match |
| `--json`           | Force JSON output                  |

### `cu spaces`

List spaces in your workspace. Useful for getting space IDs for the `--space` filter.

```bash
cu spaces
cu spaces --name "eng"
cu spaces --my
cu spaces --json
```

| Flag               | Description                         |
| ------------------ | ----------------------------------- |
| `--name <partial>` | Filter spaces by partial name match |
| `--my`             | Show only spaces you belong to      |
| `--json`           | Force JSON output                   |

### `cu open <query>`

Open a task in the browser. Accepts a task ID or partial name.

```bash
cu open abc123
cu open "login bug"
cu open abc123 --json
```

If the query matches multiple tasks by name, all matches are listed and the first is opened.

### `cu summary`

Daily standup helper. Shows tasks grouped into: recently completed, in progress, and overdue.

```bash
cu summary
cu summary --hours 48
cu summary --json
```

| Flag          | Description                                        |
| ------------- | -------------------------------------------------- |
| `--hours <n>` | Lookback for recently completed tasks (default 24) |
| `--json`      | Force JSON output                                  |

### `cu overdue`

List tasks that are past their due date (excludes done/closed tasks). Sorted most overdue first.

```bash
cu overdue
cu overdue --json
```

### `cu assign <id>`

Assign or unassign users from a task. Supports `me` as shorthand for your user ID.

```bash
cu assign abc123 --to 12345
cu assign abc123 --to me
cu assign abc123 --remove 12345
cu assign abc123 --to me --remove 67890
cu assign abc123 --to me --json
```

| Flag                | Description                       |
| ------------------- | --------------------------------- |
| `--to <userId>`     | Add assignee (user ID or `me`)    |
| `--remove <userId>` | Remove assignee (user ID or `me`) |
| `--json`            | Force JSON output                 |

### `cu config`

Manage CLI configuration.

```bash
cu config get apiToken
cu config set teamId 12345
cu config path
```

Valid keys: `apiToken`, `teamId`. Setting `apiToken` validates the `pk_` prefix.

### `cu completion <shell>`

Output shell completion script. Supports `bash`, `zsh`, and `fish`.

```bash
eval "$(cu completion bash)"                                    # Bash
eval "$(cu completion zsh)"                                     # Zsh
cu completion fish > ~/.config/fish/completions/cu.fish          # Fish
```

## Config

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

## Development

```bash
npm install
npm test          # unit tests (vitest, tests/unit/)
npm run test:e2e  # e2e tests (tests/e2e/, requires CLICKUP_API_TOKEN in .env.test)
npm run build     # tsup -> dist/
```
