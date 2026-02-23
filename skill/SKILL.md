# ClickUp CLI (`cu`) Skill

Use `cu` to interact with ClickUp tasks, initiatives, sprints, and comments.

## Setup

Run once: `cu init` (prompts for API token, auto-detects workspace).

Config: `~/.config/cu/config.json` - contains `apiToken` and `teamId`.

## Commands

### Read

| Command | Description |
|---------|-------------|
| `cu tasks [--status s] [--list id] [--space id] [--json]` | My tasks (workspace-wide) |
| `cu initiatives [--status s] [--json]` | My initiatives |
| `cu sprint [--status s] [--space name] [--json]` | My tasks in current sprint (auto-detected from my spaces) |
| `cu inbox [--json]` | Tasks updated in last 7 days |
| `cu task <id> [--raw]` | Task details |
| `cu subtasks <id> [--json]` | Subtasks of a task/initiative |
| `cu spaces [--name partial] [--my] [--json]` | List/filter workspace spaces |

### Write

| Command | Description |
|---------|-------------|
| `cu update <id> [-n name] [-d desc] [-s status]` | Update task fields |
| `cu create -n name [-l listId] [-p parentId] [-d desc] [-s status]` | Create task |
| `cu comment <id> -m text` | Post a comment |

## Output

- **Terminal (TTY):** Interactive checkbox picker - select tasks with space, enter to confirm. Shows task detail, then prompts to open in browser. Use `--json` to get raw JSON instead.
- **Piped (no TTY):** Always JSON - safe for `jq` and programmatic use.
- **Agents should always use `--json`** to get machine-readable output.

## Key facts

- Initiatives have `custom_item_id !== 0` in the API response (not a `task_type` field)
- `--list` is optional in `cu create` when `--parent` is given (list auto-detected)
- `cu sprint` auto-detects spaces from assigned tasks, then finds sprint folders + date ranges like "(2/12 - 2/25)". Use `--space Acm` to narrow search.
- All task IDs are stable alphanumeric strings (e.g. `abc123def`)

## Typical agent workflow

```bash
# See what I'm working on
cu tasks --status "in progress" --json

# Check current sprint
cu sprint --json | jq '.[].name'

# Get full context on a task
cu task abc123def --raw

# See subtasks of an initiative
cu subtasks abc123def --json

# Mark task done
cu update abc123def -s "done"

# Create subtask under initiative (no --list needed)
cu create -n "Fix the thing" -p abc123def

# Add comment
cu comment abc123def -m "Completed in PR #42"
```
