# cu - ClickUp CLI

A ClickUp CLI for AI agents and humans. JSON on stdout, errors on stderr, exit 1 on failure.

## Requirements

- Node 20+
- A ClickUp personal API token (`pk_...` from https://app.clickup.com/settings/apps)

## Install

```bash
npm install -g clickup-cli
```

## Getting started

```bash
cu init
```

Prompts for your API token, verifies it, auto-detects your workspace, and writes `~/.config/cu/config.json`.

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

### `cu inbox`
Tasks assigned to me that were updated in the last 7 days, newest first.
```bash
cu inbox
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

| Flag | Description |
|------|-------------|
| `-n, --name <text>` | New task name |
| `-d, --description <text>` | New description (markdown supported) |
| `-s, --status <status>` | New status (e.g. `"in progress"`, `"done"`) |

### `cu create`
Create a new task. If `--parent` is given, list is auto-detected from the parent task.
```bash
cu create -n "Fix login bug" -l <listId>
cu create -n "Subtask name" -p <parentTaskId>    # --list auto-detected
cu create -n "Task" -l <listId> -d "desc" -s "open"
```

| Flag | Required | Description |
|------|----------|-------------|
| `-n, --name <name>` | yes | Task name |
| `-l, --list <listId>` | if no `--parent` | Target list ID |
| `-p, --parent <taskId>` | no | Parent task (list auto-detected) |
| `-d, --description <text>` | no | Description (markdown) |
| `-s, --status <status>` | no | Initial status |

### `cu comment <id>`
Post a comment on a task.
```bash
cu comment abc123 -m "Addressed in PR #42"
```

### `cu spaces`
List spaces in your workspace. Useful for getting space IDs for `--space` filter.
```bash
cu spaces
cu spaces --json
```

### `cu init`
First-time setup. Run to create or overwrite `~/.config/cu/config.json`.

```bash
cu init
```

## Output

- **Terminal:** Pretty table by default. Use `--json` to force JSON.
- **Piped:** Always JSON (for AI agents and scripts).
- **Errors:** Plain text to stderr, exit code 1.

## For AI agents

All read commands output JSON when piped. Recommended workflow:

```bash
# List my in-progress tasks
cu tasks --status "in progress" --json | jq '.[] | {id, name}'

# Get task details
cu task abc123 --raw | jq '{id, name, status}'

# Check current sprint
cu sprint --json | jq '.[] | select(.status != "done")'

# Create subtask under initiative
INITIATIVE_ID=$(cu initiatives --json | jq -r '.[0].id')
cu create -n "New subtask" -p "$INITIATIVE_ID"

# Update status when done
cu update abc123 -s "done"
```

## Development

```bash
npm install
npm test          # unit tests (vitest)
npm run test:e2e  # e2e tests (requires CLICKUP_API_TOKEN in .env.test)
npm run build     # tsup -> dist/
```

### Claude Code skill

A skill file is included at `skill/SKILL.md`. Install it so Claude Code can use `cu` autonomously:

```bash
mkdir -p ~/.config/opencode/skills/clickup
cp skill/SKILL.md ~/.config/opencode/skills/clickup/SKILL.md
```
