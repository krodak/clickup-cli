---
name: clickup
description: 'Use when managing ClickUp tasks, initiatives, sprints, or comments via the `cu` CLI tool. Triggers: task queries, status updates, sprint tracking, creating subtasks, posting comments, standup summaries, searching tasks, checking overdue items, assigning tasks, listing spaces and lists, opening tasks in browser, checking auth or config, setting custom fields, deleting tasks, managing tags.'
---

# ClickUp CLI (`cu`)

Reference for AI agents using the `cu` CLI tool. Covers task management, sprint tracking, initiatives, comments, and project workflows.

Keywords: ClickUp, task management, sprint, initiative, project management, agile, backlog, subtasks, standup, overdue, search

## Setup

Config at `~/.config/cu/config.json` with `apiToken` and `teamId`. Run `cu init` to set up interactively.

Environment variables `CU_API_TOKEN` and `CU_TEAM_ID` override config file when both are set.

## Output Modes

| Context         | Default output        | Override          |
| --------------- | --------------------- | ----------------- |
| Terminal (TTY)  | Interactive picker UI | `--json` for JSON |
| Piped / non-TTY | Markdown tables       | `--json` for JSON |

- Default piped output is **Markdown** - optimized for agent context windows
- `cu task <id>` outputs a Markdown summary when piped; use `--json` for the full raw API object (custom fields, checklists, etc.)
- Set `CU_OUTPUT=json` to always get JSON when piped
- Set `NO_COLOR` to disable color (tables still render, just uncolored)
- Agents typically don't need `--json` unless parsing structured data with `jq`

## Commands

All commands support `--help` for full flag details.

### Read

| Command                                                                                       | What it returns                                    |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `cu tasks [--status s] [--name q] [--list id] [--space id] [--include-closed] [--json]`       | My tasks (workspace-wide)                          |
| `cu initiatives [--status s] [--name q] [--list id] [--space id] [--include-closed] [--json]` | My initiatives                                     |
| `cu assigned [--status s] [--include-closed] [--json]`                                        | All my tasks grouped by status                     |
| `cu sprint [--status s] [--space nameOrId] [--include-closed] [--json]`                       | Tasks in active sprint (auto-detected)             |
| `cu sprints [--space nameOrId] [--json]`                                                      | List all sprints (marks active with \*)            |
| `cu search <query> [--status s] [--include-closed] [--json]`                                  | Search my tasks by name (multi-word, fuzzy status) |
| `cu task <id> [--json]`                                                                       | Single task details                                |
| `cu subtasks <id> [--status s] [--name q] [--include-closed] [--json]`                        | Subtasks of a task or initiative                   |
| `cu comments <id> [--json]`                                                                   | Comments on a task                                 |
| `cu activity <id> [--json]`                                                                   | Task details + comment history combined            |
| `cu inbox [--days n] [--include-closed] [--json]`                                             | Tasks updated in last n days (default 30)          |
| `cu summary [--hours n] [--json]`                                                             | Standup helper: completed, in-progress, overdue    |
| `cu overdue [--include-closed] [--json]`                                                      | Tasks past their due date                          |
| `cu spaces [--name partial] [--my] [--json]`                                                  | List/filter workspace spaces                       |
| `cu lists <spaceId> [--name partial] [--json]`                                                | Lists in a space (including folder lists)          |
| `cu open <query> [--json]`                                                                    | Open task in browser by ID or name                 |
| `cu auth [--json]`                                                                            | Check authentication status                        |

### Write

| Command                                                                                                                                                                        | What it does                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `cu update <id> [-n name] [-d desc] [-s status] [--priority p] [--due-date d] [--time-estimate t] [--assignee id] [--parent id] [--json]`                                      | Update task fields (desc supports markdown) |
| `cu create -n name [-l listId] [-p parentId] [-d desc] [-s status] [--priority p] [--due-date d] [--time-estimate t] [--assignee id] [--tags t] [--custom-item-id n] [--json]` | Create task (desc supports markdown)        |
| `cu comment <id> -m text [--json]`                                                                                                                                             | Post comment on task                        |
| `cu assign <id> [--to userId\|me] [--remove userId\|me] [--json]`                                                                                                              | Assign/unassign users                       |
| `cu depend <id> [--on taskId] [--blocks taskId] [--remove] [--json]`                                                                                                           | Add/remove task dependencies                |
| `cu move <id> [--to listId] [--remove listId] [--json]`                                                                                                                        | Add/remove task from lists                  |
| `cu field <id> [--set "Name" value] [--remove "Name"] [--json]`                                                                                                                | Set/remove custom field values              |
| `cu delete <id> [--confirm] [--json]`                                                                                                                                          | Delete a task (DESTRUCTIVE, irreversible)   |
| `cu tag <id> [--add tags] [--remove tags] [--json]`                                                                                                                            | Add/remove tags on a task                   |
| `cu config get <key>` / `cu config set <key> <value>` / `cu config path`                                                                                                       | Manage CLI config                           |
| `cu completion <shell>`                                                                                                                                                        | Shell completions (bash/zsh/fish)           |

## Quick Reference

| Topic                   | Detail                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Task IDs                | Stable alphanumeric strings (e.g. `abc123def`)                                                                        |
| Initiatives             | Detected via `custom_item_id !== 0`                                                                                   |
| `--list` on create      | Optional when `--parent` is given (auto-detected)                                                                     |
| `--status`              | Fuzzy matching: exact > starts-with > contains. Prints match to stderr.                                               |
| `--priority`            | Names (`urgent`, `high`, `normal`, `low`) or numbers (1-4)                                                            |
| `--due-date`            | `YYYY-MM-DD` format                                                                                                   |
| `--assignee`            | Numeric user ID (find via `cu task <id> --json`)                                                                      |
| `--tags`                | Comma-separated (e.g. `--tags "bug,frontend"`)                                                                        |
| `--time-estimate`       | Duration format: `"2h"`, `"30m"`, `"1h30m"`, or raw milliseconds                                                      |
| `--custom-item-id`      | Custom task type ID (e.g. `1` for initiative)                                                                         |
| `--on` / `--blocks`     | Task dependency direction (used with `cu depend`)                                                                     |
| `--to` / `--remove`     | List ID to add/remove task (used with `cu move`)                                                                      |
| `cu field --set`        | Supports: text, number, checkbox (true/false), dropdown (option name), date (YYYY-MM-DD), url, email                  |
| `cu field`              | Field names resolved case-insensitively; errors list available fields/options                                         |
| `cu delete`             | DESTRUCTIVE. Requires `--confirm` in non-interactive mode. Cannot be undone                                           |
| `cu tag --add/--remove` | Comma-separated tag names (e.g. `--add "bug,frontend"`)                                                               |
| `--space`               | Partial name match or exact ID                                                                                        |
| `--name`                | Partial match, case-insensitive                                                                                       |
| `--include-closed`      | Include closed/done tasks (on `tasks`, `initiatives`, `assigned`, `subtasks`, `sprint`, `search`, `inbox`, `overdue`) |
| `cu assign --to me`     | Shorthand for your own user ID                                                                                        |
| `cu search`             | Matches all query words against task name, case-insensitive                                                           |
| `cu sprint`             | Auto-detects active sprint via view API and date range parsing                                                        |
| `cu summary`            | Categories: completed (done/complete/closed within N hours), in progress, overdue                                     |
| `cu overdue`            | Excludes closed tasks, sorted most overdue first                                                                      |
| `cu open`               | Tries task ID first, falls back to name search                                                                        |
| `cu task`               | Shows custom fields in detail view                                                                                    |
| `cu lists`              | Discovers list IDs needed for `--list` and `cu create -l`                                                             |
| Errors                  | stderr with exit code 1                                                                                               |
| Parsing                 | Strict - excess/unknown arguments rejected                                                                            |

## Agent Workflow Examples

### Investigate a task

```bash
cu task abc123def                   # markdown summary
cu subtasks abc123def               # child tasks (open only)
cu subtasks abc123def --include-closed  # all child tasks
cu comments abc123def               # discussion
cu activity abc123def               # task + comments combined
```

### Find tasks

```bash
cu tasks --status "in progress"     # by status
cu tasks --name "login"             # by partial name
cu search "payment flow"            # multi-word search
cu search auth --status "prog"      # fuzzy status match
cu sprint                           # current sprint
cu assigned                         # all my tasks by status
cu overdue                          # past due date
cu inbox --days 7                   # recently updated
```

### Make changes

```bash
cu update abc123def -s "done"
cu update abc123def --priority high --due-date 2025-03-15
cu update abc123def --time-estimate 2h
cu update abc123def --parent parentId    # make it a subtask
cu create -n "Fix the thing" -p abc123def
cu create -n "Fix bug" -l <listId> --priority urgent --tags "bug,frontend"
cu create -n "Q3 Roadmap" -l <listId> --custom-item-id 1  # create initiative
cu comment abc123def -m "Completed in PR #42"
cu assign abc123def --to me
cu depend task3 --on task2            # task3 waits for task2
cu depend task1 --blocks task2        # task1 blocks task2
cu move task1 --to list2 --remove list1  # move between lists
cu field abc123def --set "Story Points" 5
cu field abc123def --set "Category" "Bug Fix"
cu field abc123def --remove "Old Field"
cu tag abc123def --add "bug,frontend"
cu tag abc123def --remove "triage"
cu delete abc123def --confirm          # irreversible!
```

### Discover workspace structure

```bash
cu spaces                           # all spaces
cu spaces --name "Engineering"      # find space ID by name
cu lists <spaceId>                  # lists in a space (needs ID from cu spaces)
cu sprints                          # all sprints across folders
cu auth                             # verify token works
```

### Standup

```bash
cu summary                          # completed / in progress / overdue
cu summary --hours 48               # wider window
```

## DELETE SAFETY

IMPORTANT: Always confirm with the user before running `cu delete`. This is a destructive, irreversible operation. Even when using `--confirm` flag, verify the task ID is correct with the user first.
