---
name: clickup
description: 'Use when managing ClickUp tasks, initiatives, sprints, or comments via the `cu` CLI tool. Triggers: task queries, status updates, sprint tracking, creating subtasks, posting comments, standup summaries, searching tasks, checking overdue items, assigning tasks, listing spaces and lists, opening tasks in browser, checking auth or config.'
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

| Command                                                                    | What it returns                                    |
| -------------------------------------------------------------------------- | -------------------------------------------------- |
| `cu tasks [--status s] [--name q] [--list id] [--space id] [--json]`       | My tasks (workspace-wide)                          |
| `cu initiatives [--status s] [--name q] [--list id] [--space id] [--json]` | My initiatives                                     |
| `cu assigned [--include-closed] [--json]`                                  | All my tasks grouped by status                     |
| `cu sprint [--status s] [--space nameOrId] [--json]`                       | Tasks in active sprint (auto-detected)             |
| `cu sprints [--space nameOrId] [--json]`                                   | List all sprints (marks active with \*)            |
| `cu search <query> [--status s] [--json]`                                  | Search my tasks by name (multi-word, fuzzy status) |
| `cu task <id> [--json]`                                                    | Single task details                                |
| `cu subtasks <id> [--json]`                                                | Subtasks of a task or initiative                   |
| `cu comments <id> [--json]`                                                | Comments on a task                                 |
| `cu activity <id> [--json]`                                                | Task details + comment history combined            |
| `cu inbox [--days n] [--json]`                                             | Tasks updated in last n days (default 30)          |
| `cu summary [--hours n] [--json]`                                          | Standup helper: completed, in-progress, overdue    |
| `cu overdue [--json]`                                                      | Tasks past their due date                          |
| `cu spaces [--name partial] [--my] [--json]`                               | List/filter workspace spaces                       |
| `cu lists <spaceId> [--name partial] [--json]`                             | Lists in a space (including folder lists)          |
| `cu open <query> [--json]`                                                 | Open task in browser by ID or name                 |
| `cu auth [--json]`                                                         | Check authentication status                        |

### Write

| Command                                                                                                                               | What it does                                 |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `cu update <id> [-n name] [-d desc] [-s status] [--priority p] [--due-date d] [--assignee id] [--json]`                               | Update task fields                           |
| `cu create -n name [-l listId] [-p parentId] [-d desc] [-s status] [--priority p] [--due-date d] [--assignee id] [--tags t] [--json]` | Create task (list auto-detected from parent) |
| `cu comment <id> -m text`                                                                                                             | Post comment on task                         |
| `cu assign <id> [--to userId\|me] [--remove userId\|me] [--json]`                                                                     | Assign/unassign users                        |
| `cu config get <key>` / `cu config set <key> <value>` / `cu config path`                                                              | Manage CLI config                            |
| `cu completion <shell>`                                                                                                               | Shell completions (bash/zsh/fish)            |

## Quick Reference

| Topic               | Detail                                                                            |
| ------------------- | --------------------------------------------------------------------------------- |
| Task IDs            | Stable alphanumeric strings (e.g. `abc123def`)                                    |
| Initiatives         | Detected via `custom_item_id !== 0`                                               |
| `--list` on create  | Optional when `--parent` is given (auto-detected)                                 |
| `--status`          | Fuzzy matching: exact > starts-with > contains. Prints match to stderr.           |
| `--priority`        | Names (`urgent`, `high`, `normal`, `low`) or numbers (1-4)                        |
| `--due-date`        | `YYYY-MM-DD` format                                                               |
| `--assignee`        | Numeric user ID (find via `cu task <id> --json`)                                  |
| `--tags`            | Comma-separated (e.g. `--tags "bug,frontend"`)                                    |
| `--space`           | Partial name match or exact ID                                                    |
| `--name`            | Partial match, case-insensitive                                                   |
| `cu assign --to me` | Shorthand for your own user ID                                                    |
| `cu search`         | Matches all query words against task name, case-insensitive                       |
| `cu sprint`         | Auto-detects active sprint via view API and date range parsing                    |
| `cu summary`        | Categories: completed (done/complete/closed within N hours), in progress, overdue |
| `cu overdue`        | Excludes closed tasks, sorted most overdue first                                  |
| `cu open`           | Tries task ID first, falls back to name search                                    |
| `cu task`           | Shows custom fields in detail view                                                |
| `cu lists`          | Discovers list IDs needed for `--list` and `cu create -l`                         |
| Errors              | stderr with exit code 1                                                           |
| Parsing             | Strict - excess/unknown arguments rejected                                        |

## Agent Workflow Examples

### Investigate a task

```bash
cu task abc123def                   # markdown summary
cu subtasks abc123def               # child tasks
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
cu create -n "Fix the thing" -p abc123def
cu create -n "Fix bug" -l <listId> --priority urgent --tags "bug,frontend"
cu comment abc123def -m "Completed in PR #42"
cu assign abc123def --to me
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
