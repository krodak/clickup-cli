# Command Reference

All commands support `--help` for full flag details. When piped (no TTY), commands output Markdown by default. Pass `--json` for JSON output.

## Quick Reference

| Command                         | Description                           |
| ------------------------------- | ------------------------------------- |
| `cu init`                       | First-time setup wizard               |
| **Read**                        |                                       |
| `cu tasks`                      | List tasks assigned to me             |
| `cu sprint`                     | My tasks in the active sprint         |
| `cu sprints`                    | List all sprints across folders       |
| `cu assigned`                   | My tasks grouped by pipeline stage    |
| `cu inbox`                      | Recently updated tasks assigned to me |
| `cu task <id>`                  | Get task details                      |
| `cu subtasks <id>`              | List subtasks of a task               |
| `cu comments <id>`              | List comments on a task               |
| `cu activity <id>`              | Task details + comment history        |
| `cu lists <spaceId>`            | List all lists in a space             |
| `cu spaces`                     | List spaces in workspace              |
| `cu open <query>`               | Open a task in the browser            |
| `cu search <query>`             | Search my tasks by name               |
| `cu summary`                    | Daily standup helper                  |
| `cu overdue`                    | Tasks past their due date             |
| `cu auth`                       | Check authentication status           |
| **Write**                       |                                       |
| `cu update <id>`                | Update a task                         |
| `cu create`                     | Create a new task                     |
| `cu delete <id>`                | Delete a task                         |
| `cu field <id>`                 | Set or remove custom field values     |
| `cu comment <id>`               | Post a comment on a task              |
| `cu comment-edit <commentId>`   | Edit an existing comment              |
| `cu comment-delete <commentId>` | Delete a comment                      |
| `cu replies <commentId>`        | List threaded replies on a comment    |
| `cu reply <commentId>`          | Reply to a comment                    |
| `cu link <taskId> <linksTo>`    | Add or remove a link between tasks    |
| `cu attach <taskId> <filePath>` | Upload a file attachment to a task    |
| `cu assign <id>`                | Assign or unassign users              |
| `cu depend <id>`                | Add or remove task dependencies       |
| `cu move <id>`                  | Add or remove a task from a list      |
| `cu tag <id>`                   | Add or remove tags on a task          |
| `cu checklist`                  | Manage checklists on tasks            |
| `cu time start <taskId>`        | Start tracking time on a task         |
| `cu time stop`                  | Stop the running timer                |
| `cu time status`                | Show the currently running timer      |
| `cu time log <taskId> <dur>`    | Log a manual time entry               |
| `cu time list`                  | List recent time entries              |
| **Configuration**               |                                       |
| `cu config`                     | Manage CLI configuration              |
| `cu completion <shell>`         | Output shell completion script        |

---

## Read Commands

### `cu init`

First-time setup. Prompts for your API token, verifies it, auto-detects your workspace, and writes `~/.config/cu/config.json`.

```bash
cu init
```

### `cu tasks`

List tasks assigned to me. By default shows all task types. Use `--type` to filter by task type.

```bash
cu tasks
cu tasks --status "in progress"
cu tasks --name "login"
cu tasks --type task                  # regular tasks only
cu tasks --type initiative            # initiatives only
cu tasks --type "Bug"                 # custom task type by name
cu tasks --list <listId>
cu tasks --space <spaceId>
cu tasks --include-closed
cu tasks --json
```

### `cu sprint`

List my tasks in the currently active sprint (auto-detected from sprint folder date ranges).

```bash
cu sprint
cu sprint --status "in progress"
cu sprint --include-closed
cu sprint --json
```

### `cu sprints`

List all sprints across sprint folders. Marks the currently active sprint.

```bash
cu sprints
cu sprints --space "Engineering"
cu sprints --json
```

### `cu assigned`

All tasks assigned to me, grouped by pipeline stage (code review, in progress, to do, etc.).

```bash
cu assigned
cu assigned --status "in progress"
cu assigned --include-closed
cu assigned --json
```

### `cu inbox`

Tasks assigned to me that were recently updated, grouped by time period (today, yesterday, last 7 days, etc.). Default lookback is 30 days.

```bash
cu inbox
cu inbox --days 7
cu inbox --include-closed
cu inbox --json
```

### `cu task <id>`

Get task details including custom fields and checklists. Pretty summary in terminal, JSON when piped.

```bash
cu task abc123
cu task abc123 --json
```

**Note:** When piped, `cu task` outputs a structured Markdown summary of the task. For the full raw API response with all fields (custom fields, checklists, etc.), use `--json`.

### `cu subtasks <id>`

List subtasks of a task.

```bash
cu subtasks abc123
cu subtasks abc123 --status "in progress"
cu subtasks abc123 --name "auth"
cu subtasks abc123 --include-closed
cu subtasks abc123 --json
```

### `cu comments <id>`

List comments on a task. Formatted view in terminal, JSON when piped.

```bash
cu comments abc123
cu comments abc123 --json
```

### `cu activity <id>`

View task details and comment history together. Combines `cu task` and `cu comments` into a single view.

```bash
cu activity abc123
cu activity abc123 --json
```

### `cu lists <spaceId>`

List all lists in a space, including lists inside folders. Useful for discovering list IDs needed by `--list` filter and `cu create -l`.

```bash
cu lists <spaceId>
cu lists <spaceId> --name "sprint"
cu lists <spaceId> --json
```

| Flag               | Description                        |
| ------------------ | ---------------------------------- |
| `--name <partial>` | Filter lists by partial name match |
| `--json`           | Force JSON output                  |

### `cu spaces`

List spaces in your workspace. Useful for getting space IDs for the `--space` filter.

```bash
cu spaces
cu spaces --name "eng"
cu spaces --my
cu spaces --json
```

| Flag               | Description                                  |
| ------------------ | -------------------------------------------- |
| `--name <partial>` | Filter spaces by partial name match          |
| `--my`             | Show only spaces where I have assigned tasks |
| `--json`           | Force JSON output                            |

### `cu open <query>`

Open a task in the browser. Accepts a task ID or partial name.

```bash
cu open abc123
cu open "login bug"
cu open abc123 --json
```

If the query matches multiple tasks by name, all matches are listed and the first is opened.

### `cu search <query>`

Search my tasks by name. Supports multi-word queries with case-insensitive matching. Status filter supports fuzzy matching.

```bash
cu search "login bug"
cu search auth
cu search "payment flow" --json
cu search auth --status "prog"     # fuzzy matches "in progress"
cu search "old task" --include-closed
```

### `cu summary`

Daily standup helper. Shows tasks grouped into: recently completed, in progress, and overdue.

```bash
cu summary
cu summary --hours 48
cu summary --json
```

| Flag          | Description                                        |
| ------------- | -------------------------------------------------- |
| `--hours <n>` | Lookback for recently completed tasks (default 24) |
| `--json`      | Force JSON output                                  |

### `cu overdue`

List tasks that are past their due date (excludes done/closed tasks by default). Sorted most overdue first.

```bash
cu overdue
cu overdue --include-closed
cu overdue --json
```

### `cu auth`

Check authentication status. Validates your API token and shows your user info.

```bash
cu auth
cu auth --json
```

---

## Write Commands

### `cu update <id>`

Update a task. Provide at least one option.

```bash
cu update abc123 -s "in progress"
cu update abc123 -n "New task name"
cu update abc123 -d "Updated description with **markdown**"
cu update abc123 --priority high
cu update abc123 --due-date 2025-03-15
cu update abc123 --assignee me
cu update abc123 --assignee 12345
cu update abc123 -n "New name" -s "done" --priority urgent
cu update abc123 --time-estimate 2h
cu update abc123 --parent parentTaskId   # make it a subtask
cu update abc123 -s "in progress" --json
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

### `cu create`

Create a new task. If `--parent` is given, list is auto-detected from the parent task.

```bash
cu create -n "Fix login bug" -l <listId>
cu create -n "Subtask name" -p <parentTaskId>    # --list auto-detected
cu create -n "Task" -l <listId> -d "desc" -s "open"
cu create -n "Task" -l <listId> --priority high --due-date 2025-06-01
cu create -n "Task" -l <listId> --assignee me --tags "bug,frontend"
cu create -n "Initiative" -l <listId> --custom-item-id 1
cu create -n "Task" -l <listId> --time-estimate 2h
cu create -n "Fix bug" -l <listId> --json
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

### `cu delete <id>`

Delete a task. **DESTRUCTIVE - cannot be undone.**

```bash
cu delete abc123
cu delete abc123 --confirm
cu delete abc123 --confirm --json
```

In TTY mode without `--confirm`: shows the task name and prompts for confirmation (default: No). In non-interactive/piped mode, `--confirm` is required.

| Flag        | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| `--confirm` | Skip confirmation prompt (required in non-interactive mode) |
| `--json`    | Force JSON output                                           |

### `cu field <id>`

Set or remove a custom field value. Field names are resolved case-insensitively; errors list available fields/options.

```bash
cu field abc123 --set "Priority Level" high
cu field abc123 --set "Story Points" 5
cu field abc123 --set "Approved" true
cu field abc123 --set "Category" "Bug Fix"
cu field abc123 --set "Due" 2025-06-01
cu field abc123 --set "Website" "https://example.com"
cu field abc123 --set "Contact" "user@example.com"
cu field abc123 --remove "Priority Level"
cu field abc123 --set "Points" 3 --remove "Old Field"
cu field abc123 --set "Points" 3 --json
```

| Flag                       | Description                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `--set "Field Name" <val>` | Set a custom field by name. Supports: text, number, checkbox (true/false), dropdown (option name), date (YYYY-MM-DD), url, email |
| `--remove "Field Name"`    | Remove a custom field value                                                                                                      |
| `--json`                   | Force JSON output                                                                                                                |

Both `--set` and `--remove` can be used together in one invocation.

### `cu comment <id>`

Post a comment on a task.

```bash
cu comment abc123 -m "Addressed in PR #42"
cu comment abc123 -m "Done" --json
```

### `cu comment-edit <commentId>`

Edit an existing comment on a task.

```bash
cu comment-edit <commentId> -m "Updated text"
cu comment-edit <commentId> -m "Fixed" --resolved
cu comment-edit <commentId> -m "Reopening" --unresolved
cu comment-edit <commentId> -m "Updated" --json
```

| Flag            | Required | Description                |
| --------------- | -------- | -------------------------- |
| `-m, --message` | yes      | New comment text           |
| `--resolved`    | no       | Mark comment as resolved   |
| `--unresolved`  | no       | Mark comment as unresolved |
| `--json`        | no       | Force JSON output          |

### `cu comment-delete <commentId>`

Delete a comment.

```bash
cu comment-delete 12345
cu comment-delete 12345 --json
```

### `cu replies <commentId>`

List threaded replies on a comment.

```bash
cu replies 12345
cu replies 12345 --json
```

### `cu reply <commentId>`

Reply to a comment.

```bash
cu reply 12345 -m "Agreed, will fix"
cu reply 12345 -m "Done" --json
```

| Flag            | Required | Description       |
| --------------- | -------- | ----------------- |
| `-m, --message` | yes      | Reply text        |
| `--json`        | no       | Force JSON output |

### `cu assign <id>`

Assign or unassign users from a task. Supports `me` as shorthand for your user ID.

```bash
cu assign abc123 --to 12345
cu assign abc123 --to me
cu assign abc123 --remove 12345
cu assign abc123 --to me --remove 67890
cu assign abc123 --to me --json
```

| Flag                | Description                       |
| ------------------- | --------------------------------- |
| `--to <userId>`     | Add assignee (user ID or `me`)    |
| `--remove <userId>` | Remove assignee (user ID or `me`) |
| `--json`            | Force JSON output                 |

### `cu depend <id>`

Add or remove task dependencies. Set a task as waiting on or blocking another task.

```bash
cu depend abc123 --on def456          # abc123 depends on (waits for) def456
cu depend abc123 --blocks def456      # abc123 blocks def456
cu depend abc123 --on def456 --remove # remove the dependency
cu depend abc123 --blocks def456 --remove
cu depend abc123 --on def456 --json
```

| Flag                | Description                                 |
| ------------------- | ------------------------------------------- |
| `--on <taskId>`     | Task that this task depends on (waiting on) |
| `--blocks <taskId>` | Task that this task blocks                  |
| `--remove`          | Remove the dependency instead of adding it  |
| `--json`            | Force JSON output                           |

### `cu link <taskId> <linksTo>`

Add or remove a link between two tasks. Links are different from dependencies - they indicate a relationship without implying order.

```bash
cu link abc123 def456
cu link abc123 def456 --remove
cu link abc123 def456 --json
```

| Flag       | Required | Description                       |
| ---------- | -------- | --------------------------------- |
| `--remove` | no       | Remove the link instead of adding |
| `--json`   | no       | Force JSON output                 |

### `cu attach <taskId> <filePath>`

Upload a file attachment to a task.

```bash
cu attach abc123 ./screenshot.png
cu attach abc123 /path/to/report.pdf --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

JSON output includes the attachment ID, title, and URL.

Attachments are also shown inline when viewing task details with `cu task <id>`.

### `cu move <id>`

Add or remove a task from a list. Tasks can belong to multiple lists in ClickUp.

```bash
cu move abc123 --to <listId>                    # add task to a list
cu move abc123 --remove <listId>                # remove task from a list
cu move abc123 --to <newListId> --remove <oldListId>  # move between lists
cu move abc123 --to <listId> --json
```

| Flag                | Description                |
| ------------------- | -------------------------- |
| `--to <listId>`     | Add task to this list      |
| `--remove <listId>` | Remove task from this list |
| `--json`            | Force JSON output          |

### `cu tag <id>`

Add or remove tags on a task. Both `--add` and `--remove` can be used together.

```bash
cu tag abc123 --add "bug"
cu tag abc123 --add "bug,frontend,urgent"
cu tag abc123 --remove "wontfix"
cu tag abc123 --add "bug" --remove "triage"
cu tag abc123 --add "bug" --json
```

| Flag              | Description                         |
| ----------------- | ----------------------------------- |
| `--add <tags>`    | Comma-separated tag names to add    |
| `--remove <tags>` | Comma-separated tag names to remove |
| `--json`          | Force JSON output                   |

### `cu checklist`

Manage checklists on tasks. Six subcommands for full CRUD operations.

```bash
cu checklist view abc123                           # view all checklists on a task
cu checklist create abc123 "QA Checklist"           # add a checklist
cu checklist delete <checklistId>                   # remove a checklist
cu checklist add-item <checklistId> "Run tests"     # add an item
cu checklist edit-item <clId> <itemId> --resolved   # mark item done
cu checklist delete-item <clId> <itemId>            # remove an item
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

Checklists are also shown inline in `cu task <id>` detail view.

### `cu time start <taskId>`

Start tracking time on a task. Creates a running timer.

```bash
cu time start abc123
cu time start abc123 -d "Working on feature"
cu time start abc123 --json
```

| Flag                | Required | Description                    |
| ------------------- | -------- | ------------------------------ |
| `-d, --description` | no       | Description for the time entry |
| `--json`            | no       | Force JSON output              |

### `cu time stop`

Stop the currently running timer.

```bash
cu time stop
cu time stop --json
```

### `cu time status`

Show the currently running timer, or "No timer running" if none is active.

```bash
cu time status
cu time status --json
```

### `cu time log <taskId> <duration>`

Log a manual time entry. Duration accepts human-readable format: "2h", "30m", "1h30m", or raw milliseconds.

```bash
cu time log abc123 2h
cu time log abc123 30m -d "Code review"
cu time log abc123 1h30m --json
```

| Flag                | Required | Description                    |
| ------------------- | -------- | ------------------------------ |
| `-d, --description` | no       | Description for the time entry |
| `--json`            | no       | Force JSON output              |

### `cu time list`

List recent time entries. Defaults to the last 7 days for the authenticated user.

```bash
cu time list
cu time list --days 14
cu time list --task abc123
cu time list --days 7 --json
```

| Flag              | Required | Description                              |
| ----------------- | -------- | ---------------------------------------- |
| `--days <n>`      | no       | Number of days to look back (default: 7) |
| `--task <taskId>` | no       | Filter entries by task ID                |
| `--json`          | no       | Force JSON output                        |

---

## Configuration Commands

### `cu config`

Manage CLI configuration.

```bash
cu config get apiToken
cu config set teamId 12345
cu config path
```

Valid keys: `apiToken`, `teamId`. Setting `apiToken` validates the `pk_` prefix.

### `cu completion <shell>`

Output shell completion script. Supports `bash`, `zsh`, and `fish`.

```bash
eval "$(cu completion bash)"                                    # Bash
eval "$(cu completion zsh)"                                     # Zsh
cu completion fish > ~/.config/fish/completions/cu.fish          # Fish
```
