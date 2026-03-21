---
name: clickup
description: 'Use when managing ClickUp tasks, sprints, or comments via the `cup` CLI tool. Triggers: task queries, status updates, sprint tracking, creating subtasks, posting comments, threaded replies, standup summaries, searching tasks, checking overdue items, assigning tasks, listing spaces and lists, opening tasks in browser, checking auth or config, setting custom fields, deleting tasks, managing tags, managing checklists, editing comments, task links, time tracking, attachments, file uploads, listing members, listing fields, duplicating tasks, bulk operations, goals, key results.'
---

# ClickUp CLI (`cup`)

Reference for AI agents using the `cup` CLI tool. Covers task management, sprint tracking, comments, and project workflows.

Keywords: ClickUp, task management, sprint, project management, agile, backlog, subtasks, standup, overdue, search

## Setup

Config at `~/.config/cup/config.json` with `apiToken` and `teamId`. Optional: `sprintFolderId` to pin sprint detection to a specific folder. Run `cup init` to set up interactively.

Environment variables `CU_API_TOKEN` and `CU_TEAM_ID` override config file when both are set.

## Output Modes

| Context         | Default output        | Override          |
| --------------- | --------------------- | ----------------- |
| Terminal (TTY)  | Interactive picker UI | `--json` for JSON |
| Piped / non-TTY | Markdown tables       | `--json` for JSON |

- Default piped output is **Markdown** - optimized for agent context windows
- `cup task <id>` outputs a Markdown summary when piped; use `--json` for the full raw API object (custom fields, checklists, etc.)
- Set `CU_OUTPUT=json` to always get JSON when piped
- Set `NO_COLOR` to disable color (tables still render, just uncolored)
- Agents typically don't need `--json` unless parsing structured data with `jq`

## Commands

All commands support `--help` for full flag details.

### Read

| Command                                                                                             | What it returns                                    |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `cup tasks [--status s] [--name q] [--type t] [--list id] [--space id] [--include-closed] [--json]` | My tasks (all types, or filter with --type)        |
| `cup assigned [--status s] [--include-closed] [--json]`                                             | All my tasks grouped by status                     |
| `cup sprint [--status s] [--space nameOrId] [--folder id] [--include-closed] [--json]`              | Tasks in active sprint (auto-detected)             |
| `cup sprints [--space nameOrId] [--json]`                                                           | List all sprints (marks active with \*)            |
| `cup search <query> [--status s] [--include-closed] [--json]`                                       | Search my tasks by name (multi-word, fuzzy status) |
| `cup task <id> [--json]`                                                                            | Single task details                                |
| `cup subtasks <id> [--status s] [--name q] [--include-closed] [--json]`                             | Subtasks of a task                                 |
| `cup comments <id> [--json]`                                                                        | Comments on a task                                 |
| `cup activity <id> [--json]`                                                                        | Task details + comment history combined            |
| `cup inbox [--days n] [--include-closed] [--json]`                                                  | Tasks updated in last n days (default 30)          |
| `cup summary [--hours n] [--json]`                                                                  | Standup helper: completed, in-progress, overdue    |
| `cup overdue [--include-closed] [--json]`                                                           | Tasks past their due date                          |
| `cup spaces [--name partial] [--my] [--json]`                                                       | List/filter workspace spaces                       |
| `cup lists <spaceId> [--name partial] [--json]`                                                     | Lists in a space (including folder lists)          |
| `cup open <query> [--json]`                                                                         | Open task in browser by ID or name                 |
| `cup auth [--json]`                                                                                 | Check authentication status                        |
| `cup folders <spaceId> [--name partial] [--json]`                                                   | Folders in a space (with their lists)              |
| `cup tags <spaceId> [--json]`                                                                       | List tags available in a space                     |
| `cup members [--json]`                                                                              | List workspace members                             |
| `cup fields <listId> [--json]`                                                                      | List custom fields for a list                      |
| `cup goals [--json]`                                                                                | List goals in your workspace                       |
| `cup key-results <goalId> [--json]`                                                                 | List key results for a goal                        |
| `cup docs [query] [--json]`                                                                         | List workspace docs (optionally filter by name)    |
| `cup doc <docId> [pageId] [--json]`                                                                 | View doc metadata + page tree, or a specific page  |
| `cup doc-pages <docId> [--json]`                                                                    | All pages in a doc with content                    |

### Write

| Command                                                                                                                                                                             | What it does                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `cup update <id> [-n name] [-d desc] [-s status] [--priority p] [--due-date d] [--time-estimate t] [--assignee id\|me] [--parent id] [--json]`                                      | Update task fields (desc supports markdown)                |
| `cup create -n name [-l listId] [-p parentId] [-d desc] [-s status] [--priority p] [--due-date d] [--time-estimate t] [--assignee id\|me] [--tags t] [--custom-item-id n] [--json]` | Create task (desc supports markdown)                       |
| `cup comment <id> -m text [--notify-all] [--json]`                                                                                                                                  | Post comment on task                                       |
| `cup comment-edit <commentId> -m text [--resolved] [--unresolved] [--json]`                                                                                                         | Edit an existing comment                                   |
| `cup assign <id> [--to userId\|me] [--remove userId\|me] [--json]`                                                                                                                  | Assign/unassign users                                      |
| `cup depend <id> [--on taskId] [--blocks taskId] [--remove] [--json]`                                                                                                               | Add/remove task dependencies                               |
| `cup move <id> [--to listId] [--remove listId] [--json]`                                                                                                                            | Add/remove task from lists                                 |
| `cup field <id> [--set "Name" value] [--remove "Name"] [--json]`                                                                                                                    | Set/remove custom field values                             |
| `cup delete <id> [--confirm] [--json]`                                                                                                                                              | Delete a task (DESTRUCTIVE, irreversible)                  |
| `cup tag <id> [--add tags] [--remove tags] [--json]`                                                                                                                                | Add/remove tags on a task                                  |
| `cup checklist view <id> [--json]`                                                                                                                                                  | View checklists on a task                                  |
| `cup checklist create <id> <name> [--json]`                                                                                                                                         | Create a checklist                                         |
| `cup checklist delete <checklistId> [--json]`                                                                                                                                       | Delete a checklist                                         |
| `cup checklist add-item <checklistId> <name> [--json]`                                                                                                                              | Add item to a checklist                                    |
| `cup checklist edit-item <checklistId> <itemId> [--name n] [--resolved] [--unresolved] [--assignee id] [--json]`                                                                    | Edit a checklist item                                      |
| `cup checklist delete-item <checklistId> <itemId> [--json]`                                                                                                                         | Delete a checklist item                                    |
| `cup comment-delete <commentId> [--json]`                                                                                                                                           | Delete a comment                                           |
| `cup replies <commentId> [--json]`                                                                                                                                                  | List threaded replies on a comment                         |
| `cup reply <commentId> -m text [--notify-all] [--json]`                                                                                                                             | Reply to a comment                                         |
| `cup link <taskId> <linksTo> [--remove] [--json]`                                                                                                                                   | Add or remove link between tasks                           |
| `cup attach <taskId> <filePath> [--json]`                                                                                                                                           | Upload file attachment to a task                           |
| `cup time start <taskId> [-d desc] [--json]`                                                                                                                                        | Start tracking time on a task                              |
| `cup time stop [--json]`                                                                                                                                                            | Stop the running timer                                     |
| `cup time status [--json]`                                                                                                                                                          | Show currently running timer                               |
| `cup time log <taskId> <duration> [-d desc] [--json]`                                                                                                                               | Log manual time entry (e.g. "2h", "30m")                   |
| `cup time list [--days n] [--task id] [--json]`                                                                                                                                     | List recent time entries                                   |
| `cup time update <timeEntryId> [-d desc] [--duration dur] [--json]`                                                                                                                 | Update a time entry                                        |
| `cup time delete <timeEntryId> [--json]`                                                                                                                                            | Delete a time entry                                        |
| `cup doc-create <title> [-c content] [--json]`                                                                                                                                      | Create a new doc                                           |
| `cup doc-page-create <docId> <name> [-c content] [--parent-page pageId] [--json]`                                                                                                   | Create a page in a doc                                     |
| `cup doc-page-edit <docId> <pageId> [--name text] [-c content] [--json]`                                                                                                            | Edit a doc page                                            |
| `cup tag-create <spaceId> <name> [--fg color] [--bg color] [--json]`                                                                                                                | Create a tag in a space                                    |
| `cup tag-delete <spaceId> <name> [--json]`                                                                                                                                          | Delete a tag from a space                                  |
| `cup duplicate <taskId> [--json]`                                                                                                                                                   | Duplicate a task (read + create copy)                      |
| `cup bulk status <status> <taskIds...> [--json]`                                                                                                                                    | Bulk update status of multiple tasks                       |
| `cup goal-create <name> [-d desc] [--color hex] [--json]`                                                                                                                           | Create a goal                                              |
| `cup goal-update <goalId> [-n name] [-d desc] [--color hex] [--json]`                                                                                                               | Update a goal                                              |
| `cup key-result-create <goalId> <name> [--type t] [--target n] [--json]`                                                                                                            | Create a key result on a goal                              |
| `cup key-result-update <keyResultId> [--progress n] [--note text] [--json]`                                                                                                         | Update a key result                                        |
| `cup config get <key>` / `cup config set <key> <value>` / `cup config path`                                                                                                         | Manage CLI config (keys: apiToken, teamId, sprintFolderId) |
| `cup completion <shell>`                                                                                                                                                            | Shell completions (bash/zsh/fish)                          |

## Quick Reference

| Topic                       | Detail                                                                                                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task IDs                    | Native (`abc123def`) or custom (`PROJ-123`). Custom IDs auto-detected by `PREFIX-DIGITS` format                                                                                                                                                           |
| `--type`                    | Filter by task type: `task` (regular), or custom type name/ID (e.g. `initiative`, `Bug`)                                                                                                                                                                  |
| `--list` on create          | Optional when `--parent` is given (auto-detected)                                                                                                                                                                                                         |
| `--status`                  | Fuzzy matching: exact > starts-with > contains. Prints match to stderr.                                                                                                                                                                                   |
| `--priority`                | Names (`urgent`, `high`, `normal`, `low`) or numbers (1-4)                                                                                                                                                                                                |
| `--due-date`                | `YYYY-MM-DD` format                                                                                                                                                                                                                                       |
| `--assignee`                | User ID or `me` (on `cup create`, `cup update`, `cup assign`)                                                                                                                                                                                             |
| `--tags`                    | Comma-separated (e.g. `--tags "bug,frontend"`)                                                                                                                                                                                                            |
| `--time-estimate`           | Duration format: `"2h"`, `"30m"`, `"1h30m"`, or raw milliseconds                                                                                                                                                                                          |
| `--custom-item-id`          | Custom task type ID for `cup create` (e.g. `1` for initiative)                                                                                                                                                                                            |
| `--on` / `--blocks`         | Task dependency direction (used with `cup depend`)                                                                                                                                                                                                        |
| `--to` / `--remove`         | List ID to add/remove task (used with `cup move`)                                                                                                                                                                                                         |
| `cup field --set`           | Supports: text, number, checkbox (true/false), dropdown (option name), date (YYYY-MM-DD), url, email                                                                                                                                                      |
| `cup field`                 | Field names resolved case-insensitively; errors list available fields/options                                                                                                                                                                             |
| `cup delete`                | DESTRUCTIVE. Requires `--confirm` in non-interactive mode. Cannot be undone                                                                                                                                                                               |
| `cup tag --add/--remove`    | Comma-separated tag names (e.g. `--add "bug,frontend"`)                                                                                                                                                                                                   |
| `--space`                   | Partial name match or exact ID                                                                                                                                                                                                                            |
| `--name`                    | Partial match, case-insensitive                                                                                                                                                                                                                           |
| `--include-closed`          | Include closed/done tasks (on `tasks`, `assigned`, `subtasks`, `sprint`, `search`, `inbox`, `overdue`)                                                                                                                                                    |
| `cup assign --to me`        | Shorthand for your own user ID                                                                                                                                                                                                                            |
| `cup search`                | Matches all query words against task name, case-insensitive                                                                                                                                                                                               |
| `cup sprint`                | Auto-detects active sprint by searching for folders named sprint/iteration/cycle/scrum, parses multiple date formats (US, ISO, month-day, European), prompts in TTY when ambiguous. Override with `--folder <id>` or `cup config set sprintFolderId <id>` |
| `cup summary`               | Categories: completed (done/complete/closed within N hours), in progress, overdue                                                                                                                                                                         |
| `cup overdue`               | Excludes closed tasks, sorted most overdue first                                                                                                                                                                                                          |
| `cup open`                  | Tries task ID first, falls back to name search                                                                                                                                                                                                            |
| `cup checklist`             | Full CRUD for task checklists: view, create, delete, add-item, edit-item, delete-item                                                                                                                                                                     |
| `cup tags`                  | List available tags in a space. Useful for discovering valid tag names before using `cup tag`                                                                                                                                                             |
| `cup tag-create`            | Create a new tag in a space. Optional `--fg` and `--bg` for colors                                                                                                                                                                                        |
| `cup tag-delete`            | Delete a tag from a space                                                                                                                                                                                                                                 |
| `cup members`               | List workspace members with username, ID, and email                                                                                                                                                                                                       |
| `cup fields`                | List custom fields on a list. Shows field type, required status, and dropdown options                                                                                                                                                                     |
| `cup duplicate`             | Duplicate a task. Creates a copy with name, description, priority, tags, and time estimate                                                                                                                                                                |
| `cup bulk status`           | Update status of multiple tasks at once. Reports failures without stopping                                                                                                                                                                                |
| `cup goals`                 | List goals with progress percentage and owner                                                                                                                                                                                                             |
| `cup goal-create`           | Create a goal with optional description and color                                                                                                                                                                                                         |
| `cup goal-update`           | Update goal name, description, or color                                                                                                                                                                                                                   |
| `cup key-results`           | List key results for a goal with progress tracking                                                                                                                                                                                                        |
| `cup key-result-create`     | Create a key result (number or percentage type) with a target value                                                                                                                                                                                       |
| `cup key-result-update`     | Update key result progress or add a note                                                                                                                                                                                                                  |
| `cup time`                  | Track time: start/stop timer, log entries, list history, update/delete entries. Duration format: "2h", "30m", "1h30m"                                                                                                                                     |
| `cup time update`           | Update a time entry description or duration                                                                                                                                                                                                               |
| `cup time delete`           | Delete a time entry                                                                                                                                                                                                                                       |
| `cup comment-edit`          | Edit comment text and resolution status                                                                                                                                                                                                                   |
| `cup comment-delete`        | Delete a comment                                                                                                                                                                                                                                          |
| `cup replies` / `cup reply` | View and post threaded comment replies                                                                                                                                                                                                                    |
| Custom task IDs             | Auto-detected by format (`PROJ-123`). Uses `teamId` from config. All commands support them                                                                                                                                                                |
| `cup link` + custom IDs     | Both IDs must be the same type (both custom or both native). Mixing may not work                                                                                                                                                                          |
| `cup link`                  | Link/unlink tasks (different from dependencies)                                                                                                                                                                                                           |
| `cup attach`                | Upload files to tasks. Attachments shown in `cup task` detail view                                                                                                                                                                                        |
| `cup folders`               | List folders in a space with their contained lists                                                                                                                                                                                                        |
| `cup docs`                  | List and search workspace docs by name                                                                                                                                                                                                                    |
| `cup doc`                   | View doc metadata + page tree (no pageId), or a specific page (with pageId)                                                                                                                                                                               |
| `cup doc-pages`             | Dump all pages in a doc with full content                                                                                                                                                                                                                 |
| `cup doc-create`            | Create a new doc with optional initial content                                                                                                                                                                                                            |
| `cup doc-page-create`       | Create a page in a doc, optionally nested under a parent page                                                                                                                                                                                             |
| `cup doc-page-edit`         | Edit a doc page name or content                                                                                                                                                                                                                           |
| `cup task`                  | Shows custom fields, checklists, attachments, dependencies, and linked tasks in detail view                                                                                                                                                               |
| `cup lists`                 | Discovers list IDs needed for `--list` and `cup create -l`                                                                                                                                                                                                |
| Errors                      | stderr with exit code 1                                                                                                                                                                                                                                   |
| Parsing                     | Strict - excess/unknown arguments rejected                                                                                                                                                                                                                |

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
cup tasks --type task                # regular tasks only
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
cup update abc123def --time-estimate 2h
cup update abc123def --parent parentId    # make it a subtask
cup create -n "Fix the thing" -p abc123def
cup create -n "Fix bug" -l <listId> --priority urgent --tags "bug,frontend"
cup create -n "Q3 Roadmap" -l <listId> --custom-item-id 1  # create initiative
cup comment abc123def -m "Completed in PR #42"
cup assign abc123def --to me
cup depend task3 --on task2            # task3 waits for task2
cup depend task1 --blocks task2        # task1 blocks task2
cup move task1 --to list2 --remove list1  # move between lists
cup field abc123def --set "Story Points" 5
cup field abc123def --set "Category" "Bug Fix"
cup field abc123def --remove "Old Field"
cup tag abc123def --add "bug,frontend"
cup tag abc123def --remove "triage"
cup checklist view abc123def                           # view checklists
cup checklist create abc123def "QA Steps"              # add checklist
cup checklist add-item <clId> "Run unit tests"         # add item
cup checklist edit-item <clId> <itemId> --resolved     # check off item
cup comment-edit <commentId> -m "Updated findings"     # edit a comment
cup comment-delete <commentId>               # delete a comment
cup replies <commentId>                      # view threaded replies
cup reply <commentId> -m "Agreed, fixing"    # reply to a comment
cup link abc123 def456                       # link two tasks
cup link abc123 def456 --remove              # unlink two tasks
cup attach abc123def ./screenshot.png        # upload file to task
cup time start abc123def -d "Working on feature"  # start timer
cup time status                                    # check running timer
cup time stop                                      # stop timer
cup time log abc123def 2h -d "Code review"         # log manual entry
cup time list --days 7                             # recent entries
cup delete abc123def --confirm          # irreversible!
```

### Work with docs

```bash
cup docs                                       # list all docs
cup docs "design"                              # search docs by name
cup doc <docId>                                # doc metadata + page tree
cup doc <docId> <pageId>                       # view page content
cup doc-pages <docId>                          # all pages with content
cup doc-create "Architecture Notes"            # create a doc
cup doc-create "Notes" -c "# Draft"            # create with content
cup doc-page-create <docId> "New Section"      # add page to doc
cup doc-page-create <docId> "Sub" --parent-page <pageId>  # nested page
cup doc-page-edit <docId> <pageId> --name "Renamed"       # rename page
cup doc-page-edit <docId> <pageId> -c "# Updated content" # edit content
```

### Discover workspace structure

```bash
cup spaces                           # all spaces
cup spaces --name "Engineering"      # find space ID by name
cup folders <spaceId>                # folders with their lists
cup folders <spaceId> --name "sprint"  # filter folders by name
cup lists <spaceId>                  # lists in a space (needs ID from cup spaces)
cup sprints                          # all sprints across folders
cup members                          # workspace members
cup fields <listId>                  # custom fields on a list
cup auth                             # verify token works
cup config set sprintFolderId <id>   # pin sprint detection to a folder
```

### Bulk operations

```bash
cup duplicate abc123                 # duplicate a task
cup bulk status "done" t1 t2 t3     # mark multiple tasks done
cup tag-create <spaceId> "urgent"    # create a space tag
cup tag-delete <spaceId> "old-tag"   # delete a space tag
```

### Goals and key results

```bash
cup goals                            # list all goals
cup goal-create "Ship v2" -d "Release version 2"
cup goal-update g123 -n "Updated name"
cup key-results g123                 # key results for a goal
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
