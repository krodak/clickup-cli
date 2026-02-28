---
name: clickup
description: 'Use when managing ClickUp tasks, initiatives, sprints, or comments via the `cu` CLI tool. Covers task queries, status updates, sprint tracking, and project management workflows.'
---

# ClickUp CLI (`cu`)

Reference for AI agents using the `cu` command-line tool to interact with ClickUp. Covers task management, sprint tracking, initiatives, and comments.

Keywords: ClickUp, task management, sprint, initiative, project management, agile, backlog, subtasks

## Setup

Config at `~/.config/cu/config.json` (or `$XDG_CONFIG_HOME/cu/config.json`) with `apiToken` and `teamId`. Run `cu init` to set up.

Alternatively, set `CU_API_TOKEN` and `CU_TEAM_ID` environment variables (overrides config file, no file needed when both are set).

## Commands

All commands support `--help` for full flag details.

### Read

| Command                                                                    | What it returns                                     |
| -------------------------------------------------------------------------- | --------------------------------------------------- |
| `cu tasks [--status s] [--name q] [--list id] [--space id] [--json]`       | My tasks (workspace-wide)                           |
| `cu initiatives [--status s] [--name q] [--list id] [--space id] [--json]` | My initiatives                                      |
| `cu assigned [--include-closed] [--json]`                                  | All my tasks grouped by status                      |
| `cu sprint [--status s] [--space nameOrId] [--json]`                       | Tasks in active sprint (auto-detected)              |
| `cu inbox [--days n] [--json]`                                             | Tasks updated in last n days (default 30)           |
| `cu task <id> [--json]`                                                    | Single task details                                 |
| `cu subtasks <id> [--json]`                                                | Subtasks of a task or initiative                    |
| `cu comments <id> [--json]`                                                | List comments on a task                             |
| `cu spaces [--name partial] [--my] [--json]`                               | List/filter workspace spaces                        |
| `cu lists <spaceId> [--name partial] [--json]`                             | List all lists in a space (including folder lists)  |
| `cu open <query> [--json]`                                                 | Open task in browser by ID or name                  |
| `cu summary [--hours n] [--json]`                                          | Standup helper: completed, in-progress, overdue     |
| `cu overdue [--json]`                                                      | Tasks past their due date                           |
| `cu search <query> [--status s] [--json]`                                  | Search tasks by name (multi-word, case-insensitive) |
| `cu activity <id> [--json]`                                                | Task details + comment history combined             |
| `cu auth [--json]`                                                         | Check authentication status                         |
| `cu sprints [--space nameOrId] [--json]`                                   | List all sprints (marks active with \*)             |

### Write

| Command                                                                                                                      | What it does                                 |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `cu update <id> [-n name] [-d desc] [-s status] [--priority p] [--due-date d] [--assignee id]`                               | Update task fields                           |
| `cu create -n name [-l listId] [-p parentId] [-d desc] [-s status] [--priority p] [--due-date d] [--assignee id] [--tags t]` | Create task (list auto-detected from parent) |
| `cu comment <id> -m text`                                                                                                    | Post comment on task                         |
| `cu assign <id> [--to userId\|me] [--remove userId\|me] [--json]`                                                            | Assign/unassign users from a task            |
| `cu config get <key>` / `cu config set <key> <value>` / `cu config path`                                                     | Manage CLI config                            |
| `cu completion <shell>`                                                                                                      | Output shell completions (bash/zsh/fish)     |

## Output modes

- **TTY (terminal)**: Interactive picker UI. Use `--json` to bypass.
- **Piped / non-TTY**: Always JSON. This is what agents get by default.
- **Agents should always pass `--json`** to guarantee machine-readable output.
- Set `NO_COLOR` to disable color/interactive mode.

## Key facts

- All task IDs are stable alphanumeric strings (e.g. `abc123def`)
- Initiatives are detected via `custom_item_id !== 0` (not `task_type`)
- `--list` is optional in `cu create` when `--parent` is given (list auto-detected from parent)
- `cu sprint` auto-detects active sprint from spaces where user has tasks, using view API and date range parsing from sprint names like "Acme Sprint 4 (3/1 - 3/14)"
- `--name` on tasks/initiatives filters by partial name match (case-insensitive)
- `--space` on sprint/tasks accepts partial name match (e.g. `--space Acm`)
- `--priority` accepts names (`urgent`, `high`, `normal`, `low`) or numbers (1-4)
- `--due-date` accepts `YYYY-MM-DD` format
- `--assignee` takes a numeric user ID (use `cu task <id> --json` to find assignee IDs)
- `cu assign` supports `me` as a shorthand for your own user ID
- `cu open` tries task ID lookup first, then falls back to name search
- `cu summary` categories: completed (done/complete/closed within N hours), in progress, overdue
- `cu overdue` excludes done/complete/closed tasks, sorted most overdue first
- `--tags` accepts comma-separated tag names (e.g. `--tags "bug,frontend"`)
- `cu lists <spaceId>` discovers list IDs needed for `--list` and `cu create -l`
- Strict argument parsing - excess/unknown arguments are rejected
- `cu update -s` supports fuzzy status matching (exact > starts-with > contains). Prints matched status to stderr when fuzzy-resolved.
- `cu task` shows custom fields in detail view (read-only)
- `cu search` matches all query words against task name (case-insensitive)
- Errors go to stderr with exit code 1

## Agent workflow example

```bash
# List my in-progress tasks
cu tasks --status "in progress" --json

# Find tasks by partial name
cu tasks --name "login" --json

# Check current sprint
cu sprint --json | jq '.[].name'

# Get full details on a task
cu task abc123def --json

# List subtasks of an initiative
cu subtasks abc123def --json

# Read comments on a task
cu comments abc123def --json

# Update task status
cu update abc123def -s "done"

# Update priority and due date
cu update abc123def --priority high --due-date 2025-03-15

# Create subtask under initiative (no --list needed)
cu create -n "Fix the thing" -p abc123def

# Create task with priority and tags
cu create -n "Fix bug" -l <listId> --priority urgent --tags "bug,frontend"

# Post a comment
cu comment abc123def -m "Completed in PR #42"

# Discover lists in a space
cu lists <spaceId> --json

# Open a task in the browser
cu open abc123def

# Standup summary
cu summary --json

# Check overdue tasks
cu overdue --json

# Assign yourself to a task
cu assign abc123def --to me

# Check/set config
cu config get teamId
cu config set apiToken pk_example_token

cu search "login bug" --json

cu activity abc123def --json

cu auth --json

cu sprints --json

cu update abc123def -s "prog"
```
