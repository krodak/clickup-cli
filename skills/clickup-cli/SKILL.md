---
name: clickup
description: 'Use when managing ClickUp tasks, sprints, or comments via the `cup` CLI tool. Triggers: task queries, status updates, sprint tracking, creating subtasks, posting comments, threaded replies, standup summaries, searching tasks, checking overdue items, assigning tasks, listing spaces and lists, opening tasks in browser, checking auth or config, setting custom fields, deleting tasks, managing tags, managing checklists, editing comments, task links, time tracking, attachments, file uploads, listing members, listing fields, duplicating tasks, bulk operations, goals, key results.'
---

# ClickUp CLI (`cup`)

Reference for AI agents using the `cup` CLI tool. Covers task management, sprint tracking, comments, and project workflows.

## Setup

Config at `~/.config/cup/config.json` with `apiToken` and `teamId`. Optional: `sprintFolderId` to pin sprint detection to a specific folder. Run `cup init` to set up interactively.

Environment variables `CU_API_TOKEN` and `CU_TEAM_ID` override config file when both are set.

## Output Modes

| Context         | Default output        | Override          |
| --------------- | --------------------- | ----------------- |
| Terminal (TTY)  | Interactive picker UI | `--json` for JSON |
| Piped / non-TTY | Markdown tables       | `--json` for JSON |

- Default piped output is **Markdown** - optimized for agent context windows
- `cup task <id>` outputs a Markdown summary when piped; use `--json` for the full raw API object
- Set `CU_OUTPUT=json` to always get JSON when piped
- Agents typically don't need `--json` unless parsing structured data with `jq`

## Commands

All commands support `--help` for full flag details. All commands support `--json`.

### Read

| Command                                                                                    | What it returns                                                           |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `cup tasks [--status s] [--name q] [--type t] [--list id] [--space id] [--include-closed]` | My tasks (filter by status, name, type, list, space)                      |
| `cup assigned [--status s] [--include-closed]`                                             | All my tasks grouped by status                                            |
| `cup sprint [--status s] [--space nameOrId] [--folder id] [--include-closed]`              | Tasks in active sprint (auto-detected)                                    |
| `cup sprints [--space nameOrId]`                                                           | List all sprints (marks active with \*)                                   |
| `cup search <query> [--status s] [--include-closed]`                                       | Search my tasks by name                                                   |
| `cup task <id>`                                                                            | Single task details (custom fields, checklists, attachments, deps, links) |
| `cup subtasks <id> [--status s] [--name q] [--include-closed]`                             | Subtasks of a task                                                        |
| `cup comments <id>`                                                                        | Comments on a task                                                        |
| `cup activity <id>`                                                                        | Task details + comment history combined                                   |
| `cup inbox [--days n] [--include-closed]`                                                  | Tasks updated in last n days (default 30)                                 |
| `cup summary [--hours n]`                                                                  | Standup: completed, in-progress, overdue                                  |
| `cup overdue [--include-closed]`                                                           | Tasks past due date (most overdue first)                                  |
| `cup spaces [--name partial] [--my]`                                                       | List/filter workspace spaces                                              |
| `cup lists <spaceId> [--name partial]`                                                     | Lists in a space (including folder lists)                                 |
| `cup folders <spaceId> [--name partial]`                                                   | Folders in a space (with their lists)                                     |
| `cup members`                                                                              | Workspace members (username, ID, email)                                   |
| `cup fields <listId>`                                                                      | Custom fields on a list (type, required, options)                         |
| `cup tags <spaceId>`                                                                       | Tags available in a space                                                 |
| `cup goals`                                                                                | Workspace goals with progress                                             |
| `cup key-results <goalId>`                                                                 | Key results for a goal                                                    |
| `cup docs [query]`                                                                         | Workspace docs (optionally filter by name)                                |
| `cup doc <docId> [pageId]`                                                                 | Doc metadata + page tree, or a specific page                              |
| `cup doc-pages <docId>`                                                                    | All pages in a doc with content                                           |
| `cup task-types`                                                                           | Custom task types (for `--custom-item-id`)                                |
| `cup templates`                                                                            | Task templates (for `--template`)                                         |
| `cup open <query>`                                                                         | Open task in browser by ID or name                                        |
| `cup auth`                                                                                 | Check authentication status                                               |

### Write

| Command                                                                                                                                                                                    | What it does                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `cup create -n name [-l listId] [-p parentId] [-d desc] [-s status] [--priority p] [--due-date d] [--time-estimate t] [--assignee id\|me] [--tags t] [--custom-item-id n] [--template id]` | Create task                         |
| `cup update <id> [-n name] [-d desc] [-s status] [--priority p] [--due-date d] [--time-estimate t] [--assignee id\|me] [--parent id]`                                                      | Update task fields                  |
| `cup comment <id> -m text [--notify-all]`                                                                                                                                                  | Post comment on task                |
| `cup comment-edit <commentId> -m text [--resolved] [--unresolved]`                                                                                                                         | Edit a comment                      |
| `cup comment-delete <commentId>`                                                                                                                                                           | Delete a comment                    |
| `cup replies <commentId>`                                                                                                                                                                  | List threaded replies               |
| `cup reply <commentId> -m text [--notify-all]`                                                                                                                                             | Reply to a comment                  |
| `cup assign <id> [--to userId\|me] [--remove userId\|me]`                                                                                                                                  | Assign/unassign users               |
| `cup depend <id> [--on taskId] [--blocks taskId] [--remove]`                                                                                                                               | Add/remove dependencies             |
| `cup move <id> [--to listId] [--remove listId]`                                                                                                                                            | Add/remove task from lists          |
| `cup field <id> [--set "Name" value] [--remove "Name"]`                                                                                                                                    | Set/remove custom field values      |
| `cup tag <id> [--add tags] [--remove tags]`                                                                                                                                                | Add/remove tags on a task           |
| `cup link <taskId> <linksTo> [--remove]`                                                                                                                                                   | Link/unlink tasks                   |
| `cup attach <taskId> <filePath>`                                                                                                                                                           | Upload file attachment              |
| `cup delete <id> [--confirm]`                                                                                                                                                              | Delete task (DESTRUCTIVE)           |
| `cup duplicate <taskId>`                                                                                                                                                                   | Duplicate a task                    |
| `cup bulk status <status> <taskIds...>`                                                                                                                                                    | Bulk update status                  |
| `cup checklist view <id>`                                                                                                                                                                  | View checklists on a task           |
| `cup checklist create <id> <name>`                                                                                                                                                         | Create a checklist                  |
| `cup checklist delete <checklistId>`                                                                                                                                                       | Delete a checklist                  |
| `cup checklist add-item <checklistId> <name>`                                                                                                                                              | Add item to checklist               |
| `cup checklist edit-item <checklistId> <itemId> [--name n] [--resolved] [--unresolved] [--assignee id]`                                                                                    | Edit checklist item                 |
| `cup checklist delete-item <checklistId> <itemId>`                                                                                                                                         | Delete checklist item               |
| `cup time start <taskId> [-d desc]`                                                                                                                                                        | Start timer                         |
| `cup time stop`                                                                                                                                                                            | Stop running timer                  |
| `cup time status`                                                                                                                                                                          | Show running timer                  |
| `cup time log <taskId> <duration> [-d desc]`                                                                                                                                               | Log manual entry (e.g. "2h", "30m") |
| `cup time list [--days n] [--task id]`                                                                                                                                                     | List recent time entries            |
| `cup time update <timeEntryId> [-d desc] [--duration dur]`                                                                                                                                 | Update time entry                   |
| `cup time delete <timeEntryId>`                                                                                                                                                            | Delete time entry                   |
| `cup goal-create <name> [-d desc] [--color hex]`                                                                                                                                           | Create a goal                       |
| `cup goal-update <goalId> [-n name] [-d desc] [--color hex]`                                                                                                                               | Update a goal                       |
| `cup goal-delete <goalId>`                                                                                                                                                                 | Delete a goal                       |
| `cup key-result-create <goalId> <name> [--type t] [--target n]`                                                                                                                            | Create key result                   |
| `cup key-result-update <keyResultId> [--progress n] [--note text]`                                                                                                                         | Update key result                   |
| `cup key-result-delete <keyResultId>`                                                                                                                                                      | Delete key result                   |
| `cup doc-create <title> [-c content]`                                                                                                                                                      | Create a doc                        |
| `cup doc-page-create <docId> <name> [-c content] [--parent-page pageId]`                                                                                                                   | Create doc page                     |
| `cup doc-page-edit <docId> <pageId> [--name text] [-c content]`                                                                                                                            | Edit doc page                       |
| `cup doc-delete <docId>`                                                                                                                                                                   | Delete a doc                        |
| `cup doc-page-delete <docId> <pageId>`                                                                                                                                                     | Delete doc page                     |
| `cup tag-create <spaceId> <name> [--fg color] [--bg color]`                                                                                                                                | Create space tag                    |
| `cup tag-update <spaceId> <tagName> --name <newName> [--fg c] [--bg c]`                                                                                                                    | Update space tag                    |
| `cup tag-delete <spaceId> <name>`                                                                                                                                                          | Delete space tag                    |
| `cup config get <key>` / `set <key> <value>` / `path`                                                                                                                                      | Manage config                       |
| `cup completion <shell>`                                                                                                                                                                   | Shell completions (bash/zsh/fish)   |

## Flags & Conventions

| Topic              | Detail                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task IDs           | Native (`abc123def`) or custom (`PROJ-123`). Custom IDs auto-detected by `PREFIX-DIGITS` format                                                                               |
| `--status`         | Fuzzy matching: exact > starts-with > contains. Prints match to stderr                                                                                                        |
| `--priority`       | Names (`urgent`, `high`, `normal`, `low`) or numbers (1-4)                                                                                                                    |
| `--due-date`       | `YYYY-MM-DD` format                                                                                                                                                           |
| `--assignee`       | User ID or `me`                                                                                                                                                               |
| `--tags`           | Comma-separated (e.g. `--tags "bug,frontend"`)                                                                                                                                |
| `--time-estimate`  | Duration: `"2h"`, `"30m"`, `"1h30m"`, or raw milliseconds                                                                                                                     |
| `--type`           | `task` (regular) or custom type name/ID (e.g. `initiative`, `Bug`)                                                                                                            |
| `--custom-item-id` | Custom task type ID for `cup create` (find with `cup task-types`)                                                                                                             |
| `--space`          | Partial name match or exact ID                                                                                                                                                |
| `--name`           | Partial match, case-insensitive                                                                                                                                               |
| `--include-closed` | Include closed/done tasks                                                                                                                                                     |
| `--list` on create | Optional when `--parent` is given (auto-detected)                                                                                                                             |
| `cup field --set`  | Supports: text, number, checkbox (true/false), dropdown (option name), date (YYYY-MM-DD), url, email. Names resolved case-insensitively; errors list available fields/options |
| `cup sprint`       | Auto-detects active sprint by folder name (sprint/iteration/cycle/scrum), parses multiple date formats. Override with `--folder <id>` or `cup config set sprintFolderId <id>` |
| `cup link`         | Both IDs must be the same type (both custom or both native)                                                                                                                   |
| `cup delete`       | DESTRUCTIVE. Requires `--confirm` in non-interactive mode. Cannot be undone                                                                                                   |
| Errors             | stderr with exit code 1. Strict parsing - excess/unknown arguments rejected                                                                                                   |

## Agent Workflow Examples

### Investigate a task

```bash
cup task abc123def                   # markdown summary
cup subtasks abc123def               # child tasks (open only)
cup subtasks abc123def --include-closed  # all child tasks
cup comments abc123def               # discussion
cup activity abc123def               # task + comments combined
```

### Find tasks

```bash
cup tasks --status "in progress"     # by status
cup tasks --name "login"             # by partial name
cup tasks --type initiative          # initiatives only
cup search "payment flow"            # multi-word search
cup search auth --status "prog"      # fuzzy status match
cup sprint                           # current sprint
cup assigned                         # all my tasks by status
cup overdue                          # past due date
cup inbox --days 7                   # recently updated
```

### Make changes

```bash
cup update abc123def -s "done"
cup update abc123def --priority high --due-date 2025-03-15
cup create -n "Fix the thing" -p abc123def
cup create -n "Fix bug" -l <listId> --priority urgent --tags "bug,frontend"
cup create -n "Q3 Roadmap" -l <listId> --custom-item-id 1
cup comment abc123def -m "Completed in PR #42"
cup assign abc123def --to me
cup depend task3 --on task2            # task3 waits for task2
cup move task1 --to list2 --remove list1
cup field abc123def --set "Story Points" 5
cup tag abc123def --add "bug,frontend"
cup checklist create abc123def "QA Steps"
cup checklist add-item <clId> "Run unit tests"
cup checklist edit-item <clId> <itemId> --resolved
cup link abc123 def456
cup attach abc123def ./screenshot.png
cup time start abc123def -d "Working on feature"
cup time stop
cup time log abc123def 2h -d "Code review"
cup delete abc123def --confirm          # irreversible!
```

### Docs

```bash
cup docs "design"                              # search docs
cup doc <docId> <pageId>                       # view page
cup doc-create "Architecture Notes" -c "# Draft"
cup doc-page-create <docId> "Section" --parent-page <pageId>
cup doc-page-edit <docId> <pageId> -c "# Updated"
```

### Workspace structure

```bash
cup spaces --name "Engineering"      # find space ID
cup folders <spaceId>                # folders with their lists
cup lists <spaceId>                  # lists in a space
cup members                          # workspace members
cup fields <listId>                  # custom fields on a list
cup task-types                       # custom task types
cup templates                        # task templates
```

### Goals

```bash
cup goals
cup goal-create "Ship v2" -d "Release version 2"
cup key-results g123
cup key-result-create g123 "API coverage" --type percentage --target 80
cup key-result-update kr456 --progress 60 --note "On track"
```

### Standup

```bash
cup summary                          # completed / in progress / overdue
cup summary --hours 48               # wider window
```

## DELETE SAFETY

IMPORTANT: Always confirm with the user before running `cup delete`. This is a destructive, irreversible operation. Even when using `--confirm` flag, verify the task ID is correct with the user first.
