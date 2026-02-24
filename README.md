# cu - ClickUp CLI

A ClickUp CLI for AI agents and humans. Two operating modes: interactive tables with a task picker in terminals, raw JSON when piped.

## Requirements

- Node 22+
- A ClickUp personal API token (`pk_...` from https://app.clickup.com/settings/apps)

## Install

```bash
npm install -g @krodak/clickup-cli
```

## Getting started

```bash
cu init
```

Prompts for your API token, verifies it, auto-detects your workspace, and writes `~/.config/cu/config.json`.

## Operating Modes

### Interactive TTY mode (for humans)

When run in a terminal (TTY detected), list commands (`cu tasks`, `cu initiatives`, `cu sprint`, `cu inbox`, `cu subtasks`, `cu overdue`) display:

1. A formatted table with auto-sized columns showing task ID, name, status, type, list, and URL.
2. An interactive checkbox picker (powered by @inquirer/prompts) - navigate with arrow keys, toggle selection with space, confirm with enter.
3. For selected tasks, a rich detail view showing: name (bold/underlined), ID, status, type, list, assignees, priority, dates, estimate, tracked time, tags, parent, URL, and a description preview (first 3 lines).
4. A prompt to open the selected tasks in the browser.

Pass `--json` to any list command to bypass interactive mode and get raw JSON output in a terminal.

### JSON piped mode (for AI agents and scripts)

When output is piped (no TTY), all list commands output JSON arrays to stdout. No interactive UI is shown.

- `cu task <id> --json` returns the full JSON response for a single task.
- All list commands output JSON arrays.
- Errors go to stderr with exit code 1.
- Write commands (`update`, `create`, `comment`, `assign`) always output JSON regardless of mode.
- Set `NO_COLOR` to disable color output.

## For AI agents

Always use the `--json` flag or pipe output to ensure you get JSON. Parse with `jq` or programmatically.

```bash
# List my in-progress tasks
cu tasks --status "in progress" --json | jq '.[] | {id, name}'

# Get full task details as JSON
cu task abc123 --json | jq '{id, name, status}'

# Check current sprint
cu sprint --json | jq '.[] | select(.status != "done")'

# Create subtask under initiative
INITIATIVE_ID=$(cu initiatives --json | jq -r '.[0].id')
cu create -n "New subtask" -p "$INITIATIVE_ID"

# Update status when done
cu update abc123 -s "done"
```

Write commands (`update`, `create`, `comment`) always return JSON, no `--json` flag needed.

## AI Agents Skill

A skill file is included at `skill/SKILL.md` that teaches AI agents how to use `cu`. Install it for your agent of choice:

### OpenCode

```bash
mkdir -p ~/.config/opencode/skills/clickup
cp skill/SKILL.md ~/.config/opencode/skills/clickup/SKILL.md
```

### Claude Code

```bash
mkdir -p ~/.claude/skills/clickup
cp skill/SKILL.md ~/.claude/skills/clickup/SKILL.md
```

Then reference it in your `CLAUDE.md` or project instructions.

### Codex

Copy the contents of `skill/SKILL.md` into your Codex system prompt or project instructions file.

### Other agents

The skill file is a standalone markdown document. Feed it to any agent that supports custom instructions or tool documentation.

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

| Variable       | Description                        |
| -------------- | ---------------------------------- |
| `CU_API_TOKEN` | ClickUp personal API token (`pk_`) |
| `CU_TEAM_ID`   | Workspace (team) ID                |

When both are set, the config file is not required. Useful for CI/CD and containerized agents.

## Commands

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
cu tasks --json          # force JSON output
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
cu task abc123 --json    # full JSON response
```

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
cu lists <spaceId> --name "sprint"    # filter by partial name
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
cu spaces --name "eng"   # filter by partial name match (case-insensitive)
cu spaces --my            # show only spaces you are a member of
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
cu open abc123                # open by task ID
cu open "login bug"           # search by name, open first match
cu open abc123 --json         # output task JSON instead of opening
```

If the query matches multiple tasks by name, all matches are listed and the first is opened.

### `cu summary`

Daily standup helper. Shows tasks grouped into: recently completed, in progress, and overdue.

```bash
cu summary
cu summary --hours 48         # extend completed window to 48 hours
cu summary --json
```

| Flag          | Description                                        |
| ------------- | -------------------------------------------------- |
| `--hours <n>` | Lookback for recently completed tasks (default 24) |
| `--json`      | Force JSON output                                  |

### `cu overdue`

List tasks that are past their due date (excludes done/closed tasks).

```bash
cu overdue
cu overdue --json
```

Tasks are sorted by due date ascending (most overdue first).

### `cu assign <id>`

Assign or unassign users from a task. Supports `me` as shorthand for your user ID.

```bash
cu assign abc123 --to 12345          # add assignee
cu assign abc123 --to me             # assign yourself
cu assign abc123 --remove 12345      # remove assignee
cu assign abc123 --to me --remove 67890  # both at once
cu assign abc123 --to me --json      # output updated task JSON
```

| Flag                | Description                       |
| ------------------- | --------------------------------- |
| `--to <userId>`     | Add assignee (user ID or `me`)    |
| `--remove <userId>` | Remove assignee (user ID or `me`) |
| `--json`            | Force JSON output                 |

### `cu config`

Manage CLI configuration.

```bash
cu config get apiToken        # print a config value
cu config set teamId 12345    # set a config value
cu config path                # print config file path
```

Valid keys: `apiToken`, `teamId`. Setting `apiToken` validates the `pk_` prefix.

### `cu completion <shell>`

Output shell completion script. Supports `bash`, `zsh`, and `fish`.

```bash
# Bash - add to ~/.bashrc
eval "$(cu completion bash)"

# Zsh - add to ~/.zshrc
eval "$(cu completion zsh)"

# Fish - save to completions directory
cu completion fish > ~/.config/fish/completions/cu.fish
```

Completions cover all commands, flags, and known values (priority levels, status names, config keys).

## Development

```bash
npm install
npm test          # unit tests (vitest, tests/unit/)
npm run test:e2e  # e2e tests (tests/e2e/, requires CLICKUP_API_TOKEN in .env.test)
npm run build     # tsup -> dist/
```
