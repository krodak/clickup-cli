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

When run in a terminal (TTY detected), list commands (`cu tasks`, `cu initiatives`, `cu sprint`, `cu inbox`, `cu subtasks`) display:

1. A formatted table with auto-sized columns showing task ID, name, status, type, list, and URL.
2. An interactive checkbox picker (powered by @inquirer/prompts) - navigate with arrow keys, toggle selection with space, confirm with enter.
3. For selected tasks, a rich detail view showing: name (bold/underlined), ID, status, type, list, assignees, priority, dates, estimate, tracked time, tags, parent, URL, and a description preview (first 3 lines).
4. A prompt to open the selected tasks in the browser.

Pass `--json` to any list command to bypass interactive mode and get raw JSON output in a terminal.

### JSON piped mode (for AI agents and scripts)

When output is piped (no TTY), all list commands output JSON arrays to stdout. No interactive UI is shown.

- `cu task <id> --raw` returns the full JSON response for a single task.
- All list commands output JSON arrays.
- Errors go to stderr with exit code 1.
- Write commands (`update`, `create`, `comment`) always output JSON regardless of mode.

## For AI agents

Always use the `--json` flag or pipe output to ensure you get JSON. Parse with `jq` or programmatically.

```bash
# List my in-progress tasks
cu tasks --status "in progress" --json | jq '.[] | {id, name}'

# Get full task details as JSON
cu task abc123 --raw | jq '{id, name, status}'

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

`~/.config/cu/config.json`:

```json
{
  "apiToken": "pk_...",
  "teamId": "12345678"
}
```

## Commands

### `cu tasks`

List tasks assigned to me.

```bash
cu tasks
cu tasks --status "in progress"
cu tasks --list <listId>
cu tasks --space <spaceId>
cu tasks --json          # force JSON output
```

### `cu initiatives`

List initiatives assigned to me.

```bash
cu initiatives
cu initiatives --status "to do"
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
cu task abc123 --raw     # full JSON response
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
cu update abc123 -n "New name" -s "done"
```

| Flag                       | Description                                 |
| -------------------------- | ------------------------------------------- |
| `-n, --name <text>`        | New task name                               |
| `-d, --description <text>` | New description (markdown supported)        |
| `-s, --status <status>`    | New status (e.g. `"in progress"`, `"done"`) |

### `cu create`

Create a new task. If `--parent` is given, list is auto-detected from the parent task.

```bash
cu create -n "Fix login bug" -l <listId>
cu create -n "Subtask name" -p <parentTaskId>    # --list auto-detected
cu create -n "Task" -l <listId> -d "desc" -s "open"
```

| Flag                       | Required         | Description                      |
| -------------------------- | ---------------- | -------------------------------- |
| `-n, --name <name>`        | yes              | Task name                        |
| `-l, --list <listId>`      | if no `--parent` | Target list ID                   |
| `-p, --parent <taskId>`    | no               | Parent task (list auto-detected) |
| `-d, --description <text>` | no               | Description (markdown)           |
| `-s, --status <status>`    | no               | Initial status                   |

### `cu comment <id>`

Post a comment on a task.

```bash
cu comment abc123 -m "Addressed in PR #42"
```

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

### `cu init`

First-time setup. Run to create or overwrite `~/.config/cu/config.json`.

```bash
cu init
```

## Development

```bash
npm install
npm test          # unit tests (vitest, tests/unit/)
npm run test:e2e  # e2e tests (tests/e2e/, requires CLICKUP_API_TOKEN in .env.test)
npm run build     # tsup -> dist/
```
