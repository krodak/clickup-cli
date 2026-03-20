# Command Reference

All commands support `--help` for full flag details. When piped (no TTY), commands output Markdown by default. Pass `--json` for JSON output.

All `<id>` and `<taskId>` arguments accept both native ClickUp IDs (e.g., `abc123xyz`) and custom task IDs (e.g., `PROJ-123`). Custom task IDs are detected automatically by their `PREFIX-DIGITS` format.

## Quick Reference

| Command                          | Description                           |
| -------------------------------- | ------------------------------------- |
| `cup init`                       | First-time setup wizard               |
| **Read**                         |                                       |
| `cup tasks`                      | List tasks assigned to me             |
| `cup sprint`                     | My tasks in the active sprint         |
| `cup sprints`                    | List all sprints across folders       |
| `cup assigned`                   | My tasks grouped by pipeline stage    |
| `cup inbox`                      | Recently updated tasks assigned to me |
| `cup task <id>`                  | Get task details                      |
| `cup subtasks <id>`              | List subtasks of a task               |
| `cup comments <id>`              | List comments on a task               |
| `cup activity <id>`              | Task details + comment history        |
| `cup lists <spaceId>`            | List all lists in a space             |
| `cup spaces`                     | List spaces in workspace              |
| `cup open <query>`               | Open a task in the browser            |
| `cup search <query>`             | Search my tasks by name               |
| `cup summary`                    | Daily standup helper                  |
| `cup overdue`                    | Tasks past their due date             |
| `cup auth`                       | Check authentication status           |
| **Write**                        |                                       |
| `cup update <id>`                | Update a task                         |
| `cup create`                     | Create a new task                     |
| `cup delete <id>`                | Delete a task                         |
| `cup field <id>`                 | Set or remove custom field values     |
| `cup comment <id>`               | Post a comment on a task              |
| `cup comment-edit <commentId>`   | Edit an existing comment              |
| `cup comment-delete <commentId>` | Delete a comment                      |
| `cup replies <commentId>`        | List threaded replies on a comment    |
| `cup reply <commentId>`          | Reply to a comment                    |
| `cup link <taskId> <linksTo>`    | Add or remove a link between tasks    |
| `cup attach <taskId> <filePath>` | Upload a file attachment to a task    |
| `cup assign <id>`                | Assign or unassign users              |
| `cup depend <id>`                | Add or remove task dependencies       |
| `cup move <id>`                  | Add or remove a task from a list      |
| `cup tag <id>`                   | Add or remove tags on a task          |
| `cup checklist`                  | Manage checklists on tasks            |
| `cup time start <taskId>`        | Start tracking time on a task         |
| `cup time stop`                  | Stop the running timer                |
| `cup time status`                | Show the currently running timer      |
| `cup time log <taskId> <dur>`    | Log a manual time entry               |
| `cup time list`                  | List recent time entries              |
| **Configuration**                |                                       |
| `cup config`                     | Manage CLI configuration              |
| `cup completion <shell>`         | Output shell completion script        |

---

## Read Commands

### `cup init`

First-time setup. Prompts for your API token, verifies it, auto-detects your workspace, and writes `~/.config/cup/config.json`. Automatically migrates config from `~/.config/cu/` if present.

```bash
cup init
```

### `cup tasks`

List tasks assigned to me. By default shows all task types. Use `--type` to filter by task type.

```bash
cup tasks
cup tasks --status "in progress"
cup tasks --name "login"
cup tasks --type task                  # regular tasks only
cup tasks --type initiative            # initiatives only
cup tasks --type "Bug"                 # custom task type by name
cup tasks --list <listId>
cup tasks --space <spaceId>
cup tasks --include-closed
cup tasks --json
```

### `cup sprint`

List my tasks in the currently active sprint. Sprint detection searches for folders named sprint, iteration, cycle, or scrum, then parses list date ranges to find the active one. Supports multiple date formats (US, ISO, month-day, European). When multiple candidates match, TTY mode prompts for disambiguation.

Override auto-detection with `--folder <id>` or permanently via `cup config set sprintFolderId <id>`.

```bash
cup sprint
cup sprint --status "in progress"
cup sprint --folder 12345
cup sprint --include-closed
cup sprint --json
```

| Flag                 | Description                                  |
| -------------------- | -------------------------------------------- |
| `--status <status>`  | Filter by status (fuzzy matching)            |
| `--space <nameOrId>` | Limit to a specific space                    |
| `--folder <id>`      | Use this folder ID instead of auto-detection |
| `--include-closed`   | Include closed/done tasks                    |
| `--json`             | Force JSON output                            |

### `cup sprints`

List all sprints across sprint folders. Marks the currently active sprint.

```bash
cup sprints
cup sprints --space "Engineering"
cup sprints --json
```

### `cup assigned`

All tasks assigned to me, grouped by pipeline stage (code review, in progress, to do, etc.).

```bash
cup assigned
cup assigned --status "in progress"
cup assigned --include-closed
cup assigned --json
```

### `cup inbox`

Tasks assigned to me that were recently updated, grouped by time period (today, yesterday, last 7 days, etc.). Default lookback is 30 days.

```bash
cup inbox
cup inbox --days 7
cup inbox --include-closed
cup inbox --json
```

### `cup task <id>`

Get task details including custom fields, checklists, dependencies, and linked tasks. Pretty summary in terminal, JSON when piped.

```bash
cup task abc123
cup task abc123 --json
```

**Note:** When piped, `cup task` outputs a structured Markdown summary of the task. For the full raw API response with all fields (custom fields, checklists, etc.), use `--json`.

### `cup subtasks <id>`

List subtasks of a task.

```bash
cup subtasks abc123
cup subtasks abc123 --status "in progress"
cup subtasks abc123 --name "auth"
cup subtasks abc123 --include-closed
cup subtasks abc123 --json
```

### `cup comments <id>`

List comments on a task. Formatted view in terminal, JSON when piped.

```bash
cup comments abc123
cup comments abc123 --json
```

### `cup activity <id>`

View task details and comment history together. Combines `cup task` and `cup comments` into a single view.

```bash
cup activity abc123
cup activity abc123 --json
```

### `cup lists <spaceId>`

List all lists in a space, including lists inside folders. Useful for discovering list IDs needed by `--list` filter and `cup create -l`.

```bash
cup lists <spaceId>
cup lists <spaceId> --name "sprint"
cup lists <spaceId> --json
```

| Flag               | Description                        |
| ------------------ | ---------------------------------- |
| `--name <partial>` | Filter lists by partial name match |
| `--json`           | Force JSON output                  |

### `cup spaces`

List spaces in your workspace. Useful for getting space IDs for the `--space` filter.

```bash
cup spaces
cup spaces --name "eng"
cup spaces --my
cup spaces --json
```

| Flag               | Description                                  |
| ------------------ | -------------------------------------------- |
| `--name <partial>` | Filter spaces by partial name match          |
| `--my`             | Show only spaces where I have assigned tasks |
| `--json`           | Force JSON output                            |

### `cup open <query>`

Open a task in the browser. Accepts a task ID or partial name.

```bash
cup open abc123
cup open "login bug"
cup open abc123 --json
```

If the query matches multiple tasks by name, all matches are listed and the first is opened.

### `cup search <query>`

Search my tasks by name. Supports multi-word queries with case-insensitive matching. Status filter supports fuzzy matching.

```bash
cup search "login bug"
cup search auth
cup search "payment flow" --json
cup search auth --status "prog"     # fuzzy matches "in progress"
cup search "old task" --include-closed
```

### `cup summary`

Daily standup helper. Shows tasks grouped into: recently completed, in progress, and overdue.

```bash
cup summary
cup summary --hours 48
cup summary --json
```

| Flag          | Description                                        |
| ------------- | -------------------------------------------------- |
| `--hours <n>` | Lookback for recently completed tasks (default 24) |
| `--json`      | Force JSON output                                  |

### `cup overdue`

List tasks that are past their due date (excludes done/closed tasks by default). Sorted most overdue first.

```bash
cup overdue
cup overdue --include-closed
cup overdue --json
```

### `cup auth`

Check authentication status. Validates your API token and shows your user info.

```bash
cup auth
cup auth --json
```

---

## Write Commands

### `cup update <id>`

Update a task. Provide at least one option.

```bash
cup update abc123 -s "in progress"
cup update abc123 -n "New task name"
cup update abc123 -d "Updated description with **markdown**"
cup update abc123 --priority high
cup update abc123 --due-date 2025-03-15
cup update abc123 --assignee me
cup update abc123 --assignee 12345
cup update abc123 -n "New name" -s "done" --priority urgent
cup update abc123 --time-estimate 2h
cup update abc123 --parent parentTaskId   # make it a subtask
cup update abc123 -s "in progress" --json
```

| Flag                         | Description                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- |
| `-n, --name <text>`          | New task name                                                               |
| `-d, --description <text>`   | New description (markdown supported)                                        |
| `-s, --status <status>`      | New status, supports fuzzy matching (e.g. `"prog"` matches `"in progress"`) |
| `--priority <level>`         | Priority: `urgent`, `high`, `normal`, `low` (or 1-4)                        |
| `--due-date <date>`          | Due date (`YYYY-MM-DD`)                                                     |
| `--time-estimate <duration>` | Time estimate (e.g. `"2h"`, `"30m"`, `"1h30m"`)                             |
| `--assignee <userId>`        | Add assignee by user ID or `"me"`                                           |
| `--parent <taskId>`          | Set parent task (makes this a subtask)                                      |
| `--json`                     | Force JSON output even in terminal                                          |

### `cup create`

Create a new task. If `--parent` is given, list is auto-detected from the parent task.

```bash
cup create -n "Fix login bug" -l <listId>
cup create -n "Subtask name" -p <parentTaskId>    # --list auto-detected
cup create -n "Task" -l <listId> -d "desc" -s "open"
cup create -n "Task" -l <listId> --priority high --due-date 2025-06-01
cup create -n "Task" -l <listId> --assignee me --tags "bug,frontend"
cup create -n "Initiative" -l <listId> --custom-item-id 1
cup create -n "Task" -l <listId> --time-estimate 2h
cup create -n "Fix bug" -l <listId> --json
```

| Flag                         | Required         | Description                                          |
| ---------------------------- | ---------------- | ---------------------------------------------------- |
| `-n, --name <name>`          | yes              | Task name                                            |
| `-l, --list <listId>`        | if no `--parent` | Target list ID                                       |
| `-p, --parent <taskId>`      | no               | Parent task (list auto-detected)                     |
| `-d, --description <text>`   | no               | Description (markdown)                               |
| `-s, --status <status>`      | no               | Initial status                                       |
| `--priority <level>`         | no               | Priority: `urgent`, `high`, `normal`, `low` (or 1-4) |
| `--due-date <date>`          | no               | Due date (`YYYY-MM-DD`)                              |
| `--time-estimate <duration>` | no               | Time estimate (e.g. `"2h"`, `"30m"`, `"1h30m"`)      |
| `--assignee <userId>`        | no               | Assignee by user ID or `"me"`                        |
| `--tags <tags>`              | no               | Comma-separated tag names                            |
| `--custom-item-id <id>`      | no               | Custom task type ID (e.g. for creating initiatives)  |
| `--json`                     | no               | Force JSON output even in terminal                   |

### `cup delete <id>`

Delete a task. **DESTRUCTIVE - cannot be undone.**

```bash
cup delete abc123
cup delete abc123 --confirm
cup delete abc123 --confirm --json
```

In TTY mode without `--confirm`: shows the task name and prompts for confirmation (default: No). In non-interactive/piped mode, `--confirm` is required.

| Flag        | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| `--confirm` | Skip confirmation prompt (required in non-interactive mode) |
| `--json`    | Force JSON output                                           |

### `cup field <id>`

Set or remove a custom field value. Field names are resolved case-insensitively; errors list available fields/options.

```bash
cup field abc123 --set "Priority Level" high
cup field abc123 --set "Story Points" 5
cup field abc123 --set "Approved" true
cup field abc123 --set "Category" "Bug Fix"
cup field abc123 --set "Due" 2025-06-01
cup field abc123 --set "Website" "https://example.com"
cup field abc123 --set "Contact" "user@example.com"
cup field abc123 --remove "Priority Level"
cup field abc123 --set "Points" 3 --remove "Old Field"
cup field abc123 --set "Points" 3 --json
```

| Flag                       | Description                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `--set "Field Name" <val>` | Set a custom field by name. Supports: text, number, checkbox (true/false), dropdown (option name), date (YYYY-MM-DD), url, email |
| `--remove "Field Name"`    | Remove a custom field value                                                                                                      |
| `--json`                   | Force JSON output                                                                                                                |

Both `--set` and `--remove` can be used together in one invocation.

### `cup comment <id>`

Post a comment on a task.

```bash
cup comment abc123 -m "Addressed in PR #42"
cup comment abc123 -m "Done" --notify-all
cup comment abc123 -m "Done" --json
```

| Flag            | Required | Description               |
| --------------- | -------- | ------------------------- |
| `-m, --message` | yes      | Comment text              |
| `--notify-all`  | no       | Notify all task assignees |
| `--json`        | no       | Force JSON output         |

### `cup comment-edit <commentId>`

Edit an existing comment on a task.

```bash
cup comment-edit <commentId> -m "Updated text"
cup comment-edit <commentId> -m "Fixed" --resolved
cup comment-edit <commentId> -m "Reopening" --unresolved
cup comment-edit <commentId> -m "Updated" --json
```

| Flag            | Required | Description                |
| --------------- | -------- | -------------------------- |
| `-m, --message` | yes      | New comment text           |
| `--resolved`    | no       | Mark comment as resolved   |
| `--unresolved`  | no       | Mark comment as unresolved |
| `--json`        | no       | Force JSON output          |

### `cup comment-delete <commentId>`

Delete a comment.

```bash
cup comment-delete 12345
cup comment-delete 12345 --json
```

### `cup replies <commentId>`

List threaded replies on a comment.

```bash
cup replies 12345
cup replies 12345 --json
```

### `cup reply <commentId>`

Reply to a comment.

```bash
cup reply 12345 -m "Agreed, will fix"
cup reply 12345 -m "Done" --json
```

| Flag            | Required | Description               |
| --------------- | -------- | ------------------------- |
| `-m, --message` | yes      | Reply text                |
| `--notify-all`  | no       | Notify all task assignees |
| `--json`        | no       | Force JSON output         |

### `cup assign <id>`

Assign or unassign users from a task. Supports `me` as shorthand for your user ID.

```bash
cup assign abc123 --to 12345
cup assign abc123 --to me
cup assign abc123 --remove 12345
cup assign abc123 --to me --remove 67890
cup assign abc123 --to me --json
```

| Flag                | Description                       |
| ------------------- | --------------------------------- |
| `--to <userId>`     | Add assignee (user ID or `me`)    |
| `--remove <userId>` | Remove assignee (user ID or `me`) |
| `--json`            | Force JSON output                 |

### `cup depend <id>`

Add or remove task dependencies. Set a task as waiting on or blocking another task.

```bash
cup depend abc123 --on def456          # abc123 depends on (waits for) def456
cup depend abc123 --blocks def456      # abc123 blocks def456
cup depend abc123 --on def456 --remove # remove the dependency
cup depend abc123 --blocks def456 --remove
cup depend abc123 --on def456 --json
```

| Flag                | Description                                 |
| ------------------- | ------------------------------------------- |
| `--on <taskId>`     | Task that this task depends on (waiting on) |
| `--blocks <taskId>` | Task that this task blocks                  |
| `--remove`          | Remove the dependency instead of adding it  |
| `--json`            | Force JSON output                           |

### `cup link <taskId> <linksTo>`

Add or remove a link between two tasks. Links are different from dependencies - they indicate a relationship without implying order.

```bash
cup link abc123 def456
cup link abc123 def456 --remove
cup link abc123 def456 --json
```

| Flag       | Required | Description                       |
| ---------- | -------- | --------------------------------- |
| `--remove` | no       | Remove the link instead of adding |
| `--json`   | no       | Force JSON output                 |

### `cup attach <taskId> <filePath>`

Upload a file attachment to a task.

```bash
cup attach abc123 ./screenshot.png
cup attach abc123 /path/to/report.pdf --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

JSON output includes the attachment ID, title, and URL.

Attachments are also shown inline when viewing task details with `cup task <id>`.

### `cup move <id>`

Add or remove a task from a list. Tasks can belong to multiple lists in ClickUp.

```bash
cup move abc123 --to <listId>                    # add task to a list
cup move abc123 --remove <listId>                # remove task from a list
cup move abc123 --to <newListId> --remove <oldListId>  # move between lists
cup move abc123 --to <listId> --json
```

| Flag                | Description                |
| ------------------- | -------------------------- |
| `--to <listId>`     | Add task to this list      |
| `--remove <listId>` | Remove task from this list |
| `--json`            | Force JSON output          |

### `cup tag <id>`

Add or remove tags on a task. Both `--add` and `--remove` can be used together.

```bash
cup tag abc123 --add "bug"
cup tag abc123 --add "bug,frontend,urgent"
cup tag abc123 --remove "wontfix"
cup tag abc123 --add "bug" --remove "triage"
cup tag abc123 --add "bug" --json
```

| Flag              | Description                         |
| ----------------- | ----------------------------------- |
| `--add <tags>`    | Comma-separated tag names to add    |
| `--remove <tags>` | Comma-separated tag names to remove |
| `--json`          | Force JSON output                   |

### `cup checklist`

Manage checklists on tasks. Six subcommands for full CRUD operations.

```bash
cup checklist view abc123                           # view all checklists on a task
cup checklist create abc123 "QA Checklist"           # add a checklist
cup checklist delete <checklistId>                   # remove a checklist
cup checklist add-item <checklistId> "Run tests"     # add an item
cup checklist edit-item <clId> <itemId> --resolved   # mark item done
cup checklist delete-item <clId> <itemId>            # remove an item
```

| Subcommand    | Arguments                        | Description           |
| ------------- | -------------------------------- | --------------------- |
| `view`        | `<taskId>`                       | Show all checklists   |
| `create`      | `<taskId> <name>`                | Create a checklist    |
| `delete`      | `<checklistId>`                  | Delete a checklist    |
| `add-item`    | `<checklistId> <name>`           | Add checklist item    |
| `edit-item`   | `<checklistId> <itemId> [flags]` | Edit checklist item   |
| `delete-item` | `<checklistId> <itemId>`         | Delete checklist item |

`edit-item` flags: `--name <text>`, `--resolved`, `--unresolved`, `--assignee <userId>`. All subcommands support `--json`.

Checklists are also shown inline in `cup task <id>` detail view.

### `cup time start <taskId>`

Start tracking time on a task. Creates a running timer.

```bash
cup time start abc123
cup time start abc123 -d "Working on feature"
cup time start abc123 --json
```

| Flag                | Required | Description                    |
| ------------------- | -------- | ------------------------------ |
| `-d, --description` | no       | Description for the time entry |
| `--json`            | no       | Force JSON output              |

### `cup time stop`

Stop the currently running timer.

```bash
cup time stop
cup time stop --json
```

### `cup time status`

Show the currently running timer, or "No timer running" if none is active.

```bash
cup time status
cup time status --json
```

### `cup time log <taskId> <duration>`

Log a manual time entry. Duration accepts human-readable format: "2h", "30m", "1h30m", or raw milliseconds.

```bash
cup time log abc123 2h
cup time log abc123 30m -d "Code review"
cup time log abc123 1h30m --json
```

| Flag                | Required | Description                    |
| ------------------- | -------- | ------------------------------ |
| `-d, --description` | no       | Description for the time entry |
| `--json`            | no       | Force JSON output              |

### `cup time list`

List recent time entries. Defaults to the last 7 days for the authenticated user.

```bash
cup time list
cup time list --days 14
cup time list --task abc123
cup time list --days 7 --json
```

| Flag              | Required | Description                              |
| ----------------- | -------- | ---------------------------------------- |
| `--days <n>`      | no       | Number of days to look back (default: 7) |
| `--task <taskId>` | no       | Filter entries by task ID                |
| `--json`          | no       | Force JSON output                        |

---

## Configuration Commands

### `cup config`

Manage CLI configuration.

```bash
cup config get apiToken
cup config set teamId 12345
cup config path
```

Valid keys: `apiToken`, `teamId`, `sprintFolderId`. Setting `apiToken` validates the `pk_` prefix. Setting `sprintFolderId` pins `cup sprint` to a specific folder, skipping auto-detection.

### `cup completion <shell>`

Output shell completion script. Supports `bash`, `zsh`, and `fish`.

```bash
eval "$(cup completion bash)"                                    # Bash
eval "$(cup completion zsh)"                                     # Zsh
cup completion fish > ~/.config/fish/completions/cup.fish         # Fish
```
