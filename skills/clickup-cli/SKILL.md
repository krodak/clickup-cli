---
name: clickup
description: 'Use when managing ClickUp tasks, sprints, or comments via the `cup` CLI tool. Triggers: task queries, status updates, sprint tracking, creating subtasks, posting comments, threaded replies, standup summaries, searching tasks, checking overdue items, assigning tasks, listing spaces and lists, opening tasks in browser, checking auth or config, setting custom fields, deleting tasks, managing tags, managing checklists, editing comments, task links, time tracking, attachments, file uploads, listing members, listing fields, duplicating tasks, bulk operations, goals, key results, saved filters, favorites.'
---

# ClickUp CLI (`cup`) - skill version 1.22.0

Reference for AI agents using the `cup` CLI tool. Covers task management, sprint tracking, comments, time tracking, custom fields, goals, docs, and project workflows.

> **Version check:** Run `cup --version`. If your installed version is older than 1.22.0, update with `npm install -g @krodak/clickup-cli` and refresh this skill with `cup skill`.

## Install & Configure

### Prerequisites

Node.js 22+ required.

### Install

```bash
npm install -g @krodak/clickup-cli
```

Or via Homebrew:

```bash
brew tap krodak/tap && brew install clickup-cli
```

### Get an API token

The user needs a personal API token from ClickUp:

1. Open https://app.clickup.com/settings/apps
2. Under "API Token", click "Generate" (or copy existing)
3. The token starts with `pk_`

### Configure

**Non-interactive (recommended for agents):**

```bash
cup init --token pk_USER_TOKEN --team TEAM_ID
```

To find the team/workspace ID, the user can check their ClickUp URL: `https://app.clickup.com/TEAM_ID/...`

**Interactive (for humans in a terminal):**

```bash
cup init
```

**Environment variables (no config file needed):**

```bash
export CU_API_TOKEN="pk_..."
export CU_TEAM_ID="12345678"
```

### Verify

```bash
cup auth
```

This prints the authenticated username and workspace. If it fails, the token or config is invalid.

## Setup

Config stored at `~/.config/cup/config.json` with named profiles. Each profile has `apiToken` and `teamId`. Optional: `sprintFolderId` to pin sprint detection to a specific folder.

Multiple profiles supported - use `cup profile add <name>` to create, `cup profile use <name>` to switch, or `-p <name>` flag for one-off overrides.

`CU_PROFILE` environment variable selects a profile (overridden by `-p` flag).

## Saved Filters (Quick Shortcuts)

At the start of each session, run `cup filter list` to discover saved shortcuts for this workspace.

| Command                                            | What it does                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `cup filter list [--json]`                         | List all saved shortcuts with commands and descriptions          |
| `cup filter run <name>`                            | Execute a saved shortcut (identical to running the full command) |
| `cup filter save <name> <cmd> [args...] [-d desc]` | Save a command shortcut                                          |
| `cup filter delete <name>`                         | Remove a shortcut                                                |
| `cup filter show <name> [--json]`                  | Show a single shortcut's details                                 |

Example: `cup filter save sprint-tasks tasks --status "in progress" --list l1 -d "Current sprint tasks"`
Then: `cup filter run sprint-tasks` is equivalent to `cup tasks --status "in progress" --list l1`

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

| Command                                                                                                                                                                                                                         | What it returns                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `cup tasks [--status s] [--name q] [--type t] [--list id] [--space id] [--all] [--include-closed] [--assignee id\|me] [--tag t] [--due-before d] [--due-after d] [--created-after d] [--created-before d] [--field "Name" val]` | My tasks (filter by status, name, type, list, space, assignee, tag, dates, custom fields). `--all` for all tasks in workspace |
| `cup assigned [--status s] [--include-closed]`                                                                                                                                                                                  | All my tasks grouped by status                                                                                                |
| `cup sprint [--status s] [--space nameOrId] [--folder id] [--include-closed]`                                                                                                                                                   | Tasks in active sprint (auto-detected)                                                                                        |
| `cup sprints [--space nameOrId]`                                                                                                                                                                                                | List all sprints (marks active with \*)                                                                                       |
| `cup search <query> [--status s] [--list id] [--space id] [--all] [--include-closed] [--assignee id\|me] [--tag t] [--due-before d] [--due-after d] [--created-after d] [--created-before d] [--field "Name" val]`              | Search my tasks by name. `--all` for all tasks                                                                                |
| `cup task <id>`                                                                                                                                                                                                                 | Single task details (custom fields, checklists, attachments, deps, links)                                                     |
| `cup subtasks <id> [--status s] [--name q] [--include-closed]`                                                                                                                                                                  | Subtasks of a task                                                                                                            |
| `cup comments <id>`                                                                                                                                                                                                             | Comments on a task                                                                                                            |
| `cup activity <id>`                                                                                                                                                                                                             | Task details + comment history combined                                                                                       |
| `cup inbox [--days n] [--include-closed]`                                                                                                                                                                                       | Tasks updated in last n days (default 30)                                                                                     |
| `cup summary [--hours n]`                                                                                                                                                                                                       | Standup: completed, in-progress, overdue                                                                                      |
| `cup overdue [--include-closed]`                                                                                                                                                                                                | Tasks past due date (most overdue first)                                                                                      |
| `cup spaces [--name partial] [--my]`                                                                                                                                                                                            | List/filter workspace spaces                                                                                                  |
| `cup lists <spaceId> [--name partial]`                                                                                                                                                                                          | Lists in a space (including folder lists)                                                                                     |
| `cup folders <spaceId> [--name partial]`                                                                                                                                                                                        | Folders in a space (with their lists)                                                                                         |
| `cup members`                                                                                                                                                                                                                   | Workspace members (username, ID, email)                                                                                       |
| `cup fields <listId>`                                                                                                                                                                                                           | Custom fields on a list (type, required, options)                                                                             |
| `cup tags <spaceId>`                                                                                                                                                                                                            | Tags available in a space                                                                                                     |
| `cup goals`                                                                                                                                                                                                                     | Workspace goals with progress                                                                                                 |
| `cup key-results <goalId>`                                                                                                                                                                                                      | Key results for a goal                                                                                                        |
| `cup docs [query]`                                                                                                                                                                                                              | Workspace docs (optionally filter by name)                                                                                    |
| `cup doc <docId> [pageId]`                                                                                                                                                                                                      | Doc metadata + page tree, or a specific page                                                                                  |
| `cup doc-pages <docId>`                                                                                                                                                                                                         | All pages in a doc with content                                                                                               |
| `cup task-types`                                                                                                                                                                                                                | Custom task types (for `--custom-item-id`)                                                                                    |
| `cup templates`                                                                                                                                                                                                                 | Task templates (for `--template`)                                                                                             |
| `cup list-templates`                                                                                                                                                                                                            | List templates (for `list-from-template`)                                                                                     |
| `cup folder-templates`                                                                                                                                                                                                          | Folder templates                                                                                                              |
| `cup views <listId>`                                                                                                                                                                                                            | List views on a list                                                                                                          |
| `cup view <viewId>`                                                                                                                                                                                                             | Get view details                                                                                                              |
| `cup open <query>`                                                                                                                                                                                                              | Open task in browser by ID or name                                                                                            |
| `cup auth`                                                                                                                                                                                                                      | Check authentication status                                                                                                   |

### Write

| Command                                                                                                                                                                                                                                           | What it does                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `cup create -n name [-l listId\|sprint:current] [-p parentId] [-d desc] [-s status] [--priority p] [--due-date d] [--start-date d] [--time-estimate t] [--assignee id\|me] [--tags t] [--custom-item-id n] [--template id]`                       | Create task (`--list` accepts `sprint:current`)              |
| `cup update <id> [-n name] [-d desc] [-s status] [--priority p] [--due-date d\|none] [--start-date d] [--time-estimate t] [--assignee id\|me] [--remove-assignee id\|me] [--parent id] [--detach] [--archive] [--unarchive] [--field "Name" val]` | Update task fields (including custom fields)                 |
| `cup comment <id> -m text [--notify-all]`                                                                                                                                                                                                         | Post comment on task                                         |
| `cup comment-edit <commentId> -m text [--resolved] [--unresolved]`                                                                                                                                                                                | Edit a comment                                               |
| `cup comment-delete <commentId>` or `cup comment-delete --task <taskId> --mine [--match text]`                                                                                                                                                    | Delete a comment by ID or delete one of your task comments   |
| `cup replies <commentId>`                                                                                                                                                                                                                         | List threaded replies                                        |
| `cup reply <commentId> -m text [--notify-all]`                                                                                                                                                                                                    | Reply to a comment                                           |
| `cup assign <id> [--to ids\|me] [--remove ids\|me]`                                                                                                                                                                                               | Assign/unassign users (`--to`/`--remove` accept comma-separated IDs) |
| `cup depend <id> [--on taskId] [--blocks taskId] [--remove]`                                                                                                                                                                                      | Add/remove dependencies                                      |
| `cup move <id> [--to listId\|sprint:current] [--remove listId]`                                                                                                                                                                                   | Add/remove task from lists (`--to` accepts `sprint:current`) |
| `cup field <id> [--set "Name" value] [--remove "Name"]`                                                                                                                                                                                           | Set/remove custom field values                               |
| `cup field-create <name> -t <type> [-d desc] [--options "a,b,c"] [--required]`                                                                                                                                                                    | Create a custom field                                        |
| `cup tag <id> [--add tags] [--remove tags]`                                                                                                                                                                                                       | Add/remove tags on a task                                    |
| `cup link <taskId> <linksTo> [--remove]`                                                                                                                                                                                                          | Link/unlink tasks                                            |
| `cup attach <taskId> <filePath>`                                                                                                                                                                                                                  | Upload file attachment                                       |
| `cup delete <id> [--confirm]`                                                                                                                                                                                                                     | Delete task (DESTRUCTIVE)                                    |
| `cup duplicate <taskId>`                                                                                                                                                                                                                          | Duplicate a task                                             |
| `cup bulk status <status> <taskIds...>`                                                                                                                                                                                                           | Bulk update status                                           |
| `cup bulk assign <taskIds...> [--to userId\|me] [--remove userId\|me]`                                                                                                                                                                            | Bulk assign/unassign user from tasks                         |
| `cup bulk due-date <date\|none\|clear> <taskIds...>`                                                                                                                                                                                              | Bulk set or clear due dates                                  |
| `cup bulk tag <tagName> <taskIds...> [--add] [--remove]`                                                                                                                                                                                          | Bulk add/remove tag from tasks                               |
| `cup checklist view <id>`                                                                                                                                                                                                                         | View checklists on a task                                    |
| `cup checklist create <id> <name>`                                                                                                                                                                                                                | Create a checklist                                           |
| `cup checklist delete <checklistId>`                                                                                                                                                                                                              | Delete a checklist                                           |
| `cup checklist add-item <checklistId> <name>`                                                                                                                                                                                                     | Add item to checklist                                        |
| `cup checklist edit-item <checklistId> <itemId> [--name n] [--resolved] [--unresolved] [--assignee id]`                                                                                                                                           | Edit checklist item                                          |
| `cup checklist delete-item <checklistId> <itemId>`                                                                                                                                                                                                | Delete checklist item                                        |
| `cup time start <taskId> [-d desc]`                                                                                                                                                                                                               | Start timer                                                  |
| `cup time stop`                                                                                                                                                                                                                                   | Stop running timer                                           |
| `cup time status`                                                                                                                                                                                                                                 | Show running timer                                           |
| `cup time log <taskId> <duration> [-d desc]`                                                                                                                                                                                                      | Log manual entry (e.g. "2h", "30m")                          |
| `cup time list [--days n] [--task id] [--all]`                                                                                                                                                                                                    | List my recent time entries (--all for team)                 |
| `cup time update <timeEntryId> [-d desc] [--duration dur]`                                                                                                                                                                                        | Update time entry                                            |
| `cup time delete <timeEntryId>`                                                                                                                                                                                                                   | Delete time entry                                            |
| `cup goal-create <name> [-d desc] [--color hex]`                                                                                                                                                                                                  | Create a goal                                                |
| `cup goal-update <goalId> [-n name] [-d desc] [--color hex]`                                                                                                                                                                                      | Update a goal                                                |
| `cup goal-delete <goalId>`                                                                                                                                                                                                                        | Delete a goal                                                |
| `cup key-result-create <goalId> <name> [--type t] [--target n]`                                                                                                                                                                                   | Create key result                                            |
| `cup key-result-update <keyResultId> [--progress n] [--note text]`                                                                                                                                                                                | Update key result                                            |
| `cup key-result-delete <keyResultId>`                                                                                                                                                                                                             | Delete key result                                            |
| `cup doc-create <title> [-c content]`                                                                                                                                                                                                             | Create a doc                                                 |
| `cup doc-page-create <docId> <name> [-c content] [--parent-page pageId]`                                                                                                                                                                          | Create doc page                                              |
| `cup doc-page-edit <docId> <pageId> [--name text] [-c content]`                                                                                                                                                                                   | Edit doc page                                                |
| `cup doc-delete <docId>`                                                                                                                                                                                                                          | Delete a doc                                                 |
| `cup doc-page-delete <docId> <pageId>`                                                                                                                                                                                                            | Delete doc page                                              |
| `cup space-create <name>`                                                                                                                                                                                                                         | Create a space                                               |
| `cup list-create <spaceId> <name> [--folder folderId] [--copy-statuses-from id]`                                                                                                                                                                  | Create a list in a space or folder                           |
| `cup folder-create <spaceId> <name>`                                                                                                                                                                                                              | Create a folder in a space                                   |
| `cup tag-create <spaceId> <name> [--fg color] [--bg color]`                                                                                                                                                                                       | Create space tag                                             |
| `cup tag-update <spaceId> <tagName> --name <newName> [--fg c] [--bg c]`                                                                                                                                                                           | Update space tag                                             |
| `cup tag-delete <spaceId> <name>`                                                                                                                                                                                                                 | Delete space tag                                             |
| `cup list-from-template <name> --template <id> [--space id] [--folder id]`                                                                                                                                                                        | Create list from template                                    |
| `cup view-create <listId> <name> -t <type> [--group-by field]`                                                                                                                                                                                    | Create a view on a list                                      |
| `cup view-update <viewId> [-n name] [--group-by field]`                                                                                                                                                                                           | Update a view                                                |
| `cup view-delete <viewId> [--confirm]`                                                                                                                                                                                                            | Delete a view (DESTRUCTIVE)                                  |
| `cup favorite add <type> <id> [alias] [-n name]`                                                                                                                                                                                                  | Add a local favorite                                         |
| `cup favorite remove <alias>`                                                                                                                                                                                                                     | Remove a favorite                                            |
| `cup favorite list [--type t]`                                                                                                                                                                                                                    | List favorites (optionally filter by type)                   |
| `cup profile list [--json]`                                                                                                                                                                                                                       | List all profiles                                            |
| `cup profile add <name>`                                                                                                                                                                                                                          | Add a new profile (interactive)                              |
| `cup profile remove <name>`                                                                                                                                                                                                                       | Remove a profile                                             |
| `cup profile use <name>`                                                                                                                                                                                                                          | Set the default profile                                      |
| `cup config get <key>` / `set <key> <value>` / `path`                                                                                                                                                                                             | Manage config                                                |
| `cup completion <shell>`                                                                                                                                                                                                                          | Shell completions (bash/zsh/fish)                            |

## Global Flags

| Flag                | Description                                   |
| ------------------- | --------------------------------------------- |
| `-p, --profile <n>` | Use a specific profile for this command       |
| `--json`            | Force JSON output (available on all commands) |

## Flags & Conventions

| Topic                    | Detail                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task IDs                 | Native (`abc123def`) or custom (`PROJ-123`). Custom IDs auto-detected by `PREFIX-DIGITS` format                                                                                                                                                                                                                                                    |
| `--status`               | Fuzzy matching: exact > starts-with > contains. Prints match to stderr                                                                                                                                                                                                                                                                             |
| `--priority`             | Names (`urgent`, `high`, `normal`, `low`) or numbers (1-4)                                                                                                                                                                                                                                                                                         |
| `--due-date`             | `YYYY-MM-DD` format                                                                                                                                                                                                                                                                                                                                |
| `--assignee`             | User ID or `me`                                                                                                                                                                                                                                                                                                                                    |
| `--tags`                 | Comma-separated (e.g. `--tags "bug,frontend"`)                                                                                                                                                                                                                                                                                                     |
| `--time-estimate`        | Duration: `"2h"`, `"30m"`, `"1h30m"`, or raw milliseconds                                                                                                                                                                                                                                                                                          |
| `--type`                 | `task` (regular) or custom type name/ID (e.g. `initiative`, `Bug`)                                                                                                                                                                                                                                                                                 |
| `--custom-item-id`       | Custom task type ID for `cup create` (find with `cup task-types`)                                                                                                                                                                                                                                                                                  |
| `--space`                | Partial name match or exact ID                                                                                                                                                                                                                                                                                                                     |
| `--name`                 | Partial match, case-insensitive                                                                                                                                                                                                                                                                                                                    |
| `--all`                  | Show all tasks in workspace, not just assigned to me. Available on `tasks`, `search`, `overdue`. Default: my tasks only (smaller output for agent context windows)                                                                                                                                                                                 |
| `--include-closed`       | Include closed/done tasks                                                                                                                                                                                                                                                                                                                          |
| `--list` on create       | Optional when `--parent` is given (auto-detected). Accepts `sprint:current` pseudo-ID                                                                                                                                                                                                                                                              |
| `cup field --set`        | Supports: text, number, checkbox (true/false), dropdown (option name), labels (comma-separated names), date (YYYY-MM-DD), url, email, emoji/rating (0-5), manual_progress (0-100), tasks/relationship (comma-separated task IDs), users/people (comma-separated user IDs). Names resolved case-insensitively; errors list available fields/options |
| `cup field-create`       | Use `--options "a,b,c"` for `drop_down` and `labels` types (required). Other types don't need `--options`                                                                                                                                                                                                                                          |
| `--field` filter         | `--field "Name" value` on `tasks` and `search` requires `--list` to resolve field names to IDs                                                                                                                                                                                                                                                     |
| `--due-before/after`     | `YYYY-MM-DD` date filters for due date range                                                                                                                                                                                                                                                                                                       |
| `--created-before/after` | `YYYY-MM-DD` date filters for creation date range                                                                                                                                                                                                                                                                                                  |
| `cup sprint`             | Auto-detects active sprint by folder name (sprint/iteration/cycle/scrum), parses multiple date formats. Override with `--folder <id>`, `cup config set sprintFolderId <id>`, or favorite a sprint folder                                                                                                                                           |
| `cup favorite`           | Local-only favorites (not synced to ClickUp). Types: sprint-folder, space, list, folder, view, task. Favorited sprint-folders auto-used by sprint commands                                                                                                                                                                                         |
| `cup link`               | Both IDs must be the same type (both custom or both native)                                                                                                                                                                                                                                                                                        |
| `cup delete`             | DESTRUCTIVE. Requires `--confirm` in non-interactive mode. Cannot be undone                                                                                                                                                                                                                                                                        |
| Errors                   | stderr with exit code 1. Strict parsing - excess/unknown arguments rejected                                                                                                                                                                                                                                                                        |

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
cup tasks --list 12345 --all         # all tasks in list, not just mine
cup tasks --tag "bug" --status "to do"  # by tag and status
cup tasks --list 123 --field "Sprint" "Week 1"  # by custom field
cup tasks --due-before 2026-04-01    # due before a date
cup tasks --assignee me --created-after 2026-03-01  # my tasks created recently
cup search "payment flow"            # multi-word search
cup search auth --status "prog"      # fuzzy status match
cup search "auth" --list 123 --space 456  # search within list and space
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
cup create -n "Bug fix" -l sprint:current         # create in active sprint
cup create -n "Q3 Roadmap" -l <listId> --custom-item-id 1
cup comment abc123def -m "Completed in PR #42"
cup assign abc123def --to me
cup assign abc123def --to 12345,67890        # assign multiple users at once
cup depend task3 --on task2            # task3 waits for task2
cup move task1 --to list2 --remove list1
cup move task1 --to sprint:current               # move to active sprint
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
cup space-create "New Space"         # create a space
cup folder-create <spaceId> "Q2"     # create a folder
cup list-create <spaceId> "Backlog"  # create a list
cup list-create <spaceId> "Sprint" --folder <folderId>
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

### Profiles

```bash
cup profile add personal             # add a profile (interactive)
cup profile list                     # list all profiles
cup profile use personal             # switch default
cup tasks -p work                    # use specific profile for one command
```

### Favorites

```bash
cup favorite add sprint-folder 12345 --name "Team Sprint"  # favorite a sprint folder
cup favorite add space 67890 eng                           # favorite a space with alias
cup favorite list                                          # list all favorites
cup favorite list --type sprint-folder                     # list only sprint folders
cup favorite remove eng                                    # remove by alias
cup sprint                                                 # auto-uses favorited sprint folder
```

### Standup

```bash
cup summary                          # completed / in progress / overdue
cup summary --hours 48               # wider window
```

## DELETE SAFETY

IMPORTANT: Always confirm with the user before running `cup delete`. This is a destructive, irreversible operation. Even when using `--confirm` flag, verify the task ID is correct with the user first.
