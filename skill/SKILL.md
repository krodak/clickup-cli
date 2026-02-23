---
name: clickup
description: 'Use when managing ClickUp tasks, initiatives, sprints, or comments via the `cu` CLI tool. Covers task queries, status updates, sprint tracking, and project management workflows.'
---

# ClickUp CLI (`cu`)

Reference for AI agents using the `cu` command-line tool to interact with ClickUp. Covers task management, sprint tracking, initiatives, and comments.

Keywords: ClickUp, task management, sprint, initiative, project management, agile, backlog, subtasks

## Setup

Config at `~/.config/cu/config.json` with `apiToken` and `teamId`. Run `cu init` to set up.

## Commands

All commands support `--help` for full flag details.

### Read

| Command                                                   | What it returns                        |
| --------------------------------------------------------- | -------------------------------------- |
| `cu tasks [--status s] [--list id] [--space id] [--json]` | My tasks (workspace-wide)              |
| `cu initiatives [--status s] [--json]`                    | My initiatives                         |
| `cu sprint [--status s] [--space nameOrId] [--json]`      | Tasks in active sprint (auto-detected) |
| `cu inbox [--json]`                                       | Tasks updated in last 7 days           |
| `cu task <id> [--raw]`                                    | Single task details                    |
| `cu subtasks <id> [--json]`                               | Subtasks of a task or initiative       |
| `cu spaces [--name partial] [--my] [--json]`              | List/filter workspace spaces           |

### Write

| Command                                                             | What it does                                 |
| ------------------------------------------------------------------- | -------------------------------------------- |
| `cu update <id> [-n name] [-d desc] [-s status]`                    | Update task fields                           |
| `cu create -n name [-l listId] [-p parentId] [-d desc] [-s status]` | Create task (list auto-detected from parent) |
| `cu comment <id> -m text`                                           | Post comment on task                         |

## Output modes

- **TTY (terminal)**: Interactive picker UI. Use `--json` to bypass.
- **Piped / non-TTY**: Always JSON. This is what agents get by default.
- **Agents should always pass `--json`** to guarantee machine-readable output.

## Key facts

- All task IDs are stable alphanumeric strings (e.g. `abc123def`)
- Initiatives are detected via `custom_item_id !== 0` (not `task_type`)
- `--list` is optional in `cu create` when `--parent` is given (list auto-detected from parent)
- `cu sprint` auto-detects active sprint from spaces where user has tasks, using view API and date range parsing from sprint names like "Acme Sprint 4 (3/1 - 3/14)"
- `--space` on sprint/tasks accepts partial name match (e.g. `--space Acm`)
- Strict argument parsing - excess/unknown arguments are rejected
- Errors go to stderr with exit code 1

## Agent workflow example

```bash
# List my in-progress tasks
cu tasks --status "in progress" --json

# Check current sprint
cu sprint --json | jq '.[].name'

# Get full details on a task
cu task abc123def --raw

# List subtasks of an initiative
cu subtasks abc123def --json

# Update task status
cu update abc123def -s "done"

# Create subtask under initiative (no --list needed)
cu create -n "Fix the thing" -p abc123def

# Post a comment
cu comment abc123def -m "Completed in PR #42"
```
