# Command Reference

All commands support `--help` for full flag details. When piped (no TTY), commands output Markdown by default. Pass `--json` for JSON output.

## Output Modes

Commands behave differently based on how they're invoked:

| Context            | Behavior                                                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminal (TTY)** | Task listing commands show an interactive picker (navigate with ↑/↓ or j/k, Space to select, Enter to confirm). Selected tasks display full details and offer to open in browser. Color-coded output. |
| **Piped**          | Clean markdown output, no colors, no prompts. Suitable for agents and scripts.                                                                                                                        |
| **`--json` flag**  | Structured JSON output. No prompts. Overrides both TTY and piped modes.                                                                                                                               |

Interactive prompts also appear for: sprint disambiguation (multiple matches), workspace selection (`cup init`), agent selection (`cup skill`), and destructive confirmations (`cup delete`, `cup archive`, `cup view-delete`).

## Shell Quoting for Descriptions

When `--description` / `-d` contains markdown with backticks or newlines, use `$'...'` (ANSI-C quoting) instead of double quotes or heredocs:

```bash
# Correct — backticks and newlines preserved
cup update abc123 -d $'## API Notes\n\nCall `init()` before `run()`.\n\n- Step 1\n- Step 2'

# Broken — heredoc strips backticks
cup update abc123 -d "$(cat <<'EOF'
Call `init()` here
EOF
)"
```

This applies to `cup create -d`, `cup update -d`, `cup comment -m`, and `cup reply -m`. The same `$'...'` quoting works for any flag value containing backticks.

## Custom Task IDs

ClickUp workspaces can configure custom task IDs with a prefix per space (e.g., `PROJ-123`, `DEV-42`). The CLI detects these automatically - any ID matching the `PREFIX-DIGITS` format (uppercase letters, hyphen, digits) is treated as a custom task ID.

All commands that accept task IDs work with both native IDs and custom IDs:

```bash
cup task PROJ-123
cup update DEV-42 --status done
cup comment PROJ-456 -m "Fixed in latest commit"
cup subtasks DEV-100
```

Custom ID resolution uses the `teamId` from your config, which is required (`cup init` sets it up).

**Task links with custom IDs:** The `cup link` command passes both task IDs in a single API request. When both IDs are custom, this works correctly. However, mixing custom and native IDs in a single link command may not work as expected because the ClickUp API applies the `custom_task_ids` flag to all IDs in the request.

<!-- quick-reference:start -->

## Quick Reference

| Command                                  | Description                                                      |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `cup init`                               | First-time setup (interactive, or use --token --team for agents) |
| `cup skill`                              | Install skill for your agents                                    |
| `cup filter save <name> [args...]`       | Save a command shortcut                                          |
| **Read**                                 |                                                                  |
| `cup auth`                               | Check authentication status                                      |
| `cup tasks`                              | My tasks (--all for all assignees)                               |
| `cup task <taskId>`                      | Get task details                                                 |
| `cup sprint`                             | My tasks in the active sprint                                    |
| `cup sprints`                            | List all sprints across folders                                  |
| `cup subtasks <taskId>`                  | List subtasks of a task                                          |
| `cup comments <taskId>`                  | List comments on a task                                          |
| `cup replies <commentId>`                | List threaded replies on a comment                               |
| `cup activity <taskId>`                  | Task details + comment history                                   |
| `cup lists <spaceId>`                    | List all lists in a space                                        |
| `cup spaces`                             | List spaces in workspace                                         |
| `cup inbox`                              | Recently updated tasks assigned to me                            |
| `cup assigned`                           | My tasks grouped by pipeline stage                               |
| `cup open <query>`                       | Open a task in the browser                                       |
| `cup search <query>`                     | Search your tasks by name (--all for all assignees)              |
| `cup summary`                            | Daily standup helper                                             |
| `cup overdue`                            | Tasks past their due date                                        |
| `cup tags <spaceId>`                     | List tags in a space                                             |
| `cup time-in-status <taskId>`            | Show how long a task has been in each status                     |
| `cup docs [query]`                       | List workspace docs                                              |
| `cup doc <docId> [pageId]`               | View a doc or doc page                                           |
| `cup doc-pages <docId>`                  | All pages in a doc with content                                  |
| `cup folders <spaceId>`                  | List folders in a space                                          |
| `cup members`                            | List workspace members                                           |
| `cup fields <listId>`                    | List custom fields for a list                                    |
| `cup goals`                              | List goals in your workspace                                     |
| `cup key-results <goalId>`               | List key results for a goal                                      |
| `cup task-types`                         | List custom task types                                           |
| `cup templates`                          | List task templates                                              |
| `cup list-templates`                     | List list templates                                              |
| `cup folder-templates`                   | List folder templates                                            |
| `cup views <id>`                         | List views on a list, space, folder, or workspace                |
| `cup view <viewId>`                      | Get view details                                                 |
| `cup filter list`                        | List saved shortcuts                                             |
| `cup filter run <name>`                  | Run a saved shortcut                                             |
| `cup favorite list`                      | List saved favorites                                             |
| `cup chat channels`                      | List chat channels you follow                                    |
| `cup chat channel <channelId>`           | Show channel details                                             |
| `cup chat messages <channelId>`          | List recent messages in a channel                                |
| `cup chat members <channelId>`           | List channel members                                             |
| `cup chat followers <channelId>`         | List channel followers                                           |
| `cup chat replies <messageId>`           | List replies to a message                                        |
| `cup chat reactions <messageId>`         | List reactions on a message                                      |
| **Write**                                |                                                                  |
| `cup update <taskId>`                    | Update a task                                                    |
| `cup create`                             | Create a new task                                                |
| `cup comment <taskId>`                   | Post a comment on a task                                         |
| `cup comment-edit <commentId>`           | Edit an existing comment                                         |
| `cup comment-delete [commentId]`         | Delete a comment                                                 |
| `cup reply <commentId>`                  | Reply to a comment                                               |
| `cup archive <taskId>`                   | Archive or unarchive a task                                      |
| `cup assign <taskId>`                    | Assign or unassign users                                         |
| `cup depend <taskId>`                    | Add or remove task dependencies                                  |
| `cup link <taskId> <linksTo>`            | Add or remove a link between tasks                               |
| `cup attach <taskId> <filePath>`         | Upload a file attachment to a task                               |
| `cup move <taskId>`                      | Add or remove a task from a list                                 |
| `cup field <taskId>`                     | Set or remove custom field values                                |
| `cup delete <taskId>`                    | Delete a task                                                    |
| `cup tag <taskId>`                       | Add or remove tags on a task                                     |
| `cup tag-create <spaceId> <name>`        | Create a tag in a space                                          |
| `cup tag-delete <spaceId> <name>`        | Delete a tag from a space                                        |
| `cup tag-update <spaceId> <tagName>`     | Update a tag in a space                                          |
| `cup checklist`                          | Manage checklists on tasks                                       |
| `cup time start <taskId>`                | Start tracking time on a task                                    |
| `cup time stop`                          | Stop the running timer                                           |
| `cup time status`                        | Show the currently running timer                                 |
| `cup time log <taskId> <duration>`       | Log a manual time entry                                          |
| `cup time list`                          | List my recent time entries (--all for team)                     |
| `cup time update <timeEntryId>`          | Update a time entry                                              |
| `cup time delete <timeEntryId>`          | Delete a time entry                                              |
| `cup doc-create <title>`                 | Create a new doc                                                 |
| `cup doc-page-create <docId> <name>`     | Create a page in a doc                                           |
| `cup doc-page-edit <docId> <pageId>`     | Edit a doc page                                                  |
| `cup doc-delete <docId>`                 | Delete a doc                                                     |
| `cup doc-page-delete <docId> <pageId>`   | Delete a doc page                                                |
| `cup space-create <name>`                | Create a space                                                   |
| `cup list-create <spaceId> <name>`       | Create a list in a space                                         |
| `cup folder-create <spaceId> <name>`     | Create a folder in a space                                       |
| `cup list-rename <listId> <newName>`     | Rename a list                                                    |
| `cup folder-rename <folderId> <newName>` | Rename a folder                                                  |
| `cup space-rename <spaceId> <newName>`   | Rename a space                                                   |
| `cup field-create <name>`                | Create a custom field in your workspace                          |
| `cup duplicate <taskId>`                 | Duplicate a task                                                 |
| `cup bulk status <status> <taskIds...>`  | Bulk update task status                                          |
| `cup bulk assign <taskIds...>`           | Bulk assign user to tasks                                        |
| `cup bulk due-date <date> <taskIds...>`  | Bulk set due date                                                |
| `cup bulk tag <tagName> <taskIds...>`    | Bulk add/remove tag                                              |
| `cup bulk priority <taskIds...>`         | Bulk set priority on tasks                                       |
| `cup bulk field <taskIds...>`            | Bulk set a custom field value on tasks                           |
| `cup bulk move <taskIds...>`             | Move multiple tasks to a destination list                        |
| `cup goal-create <name>`                 | Create a goal                                                    |
| `cup goal-update <goalId>`               | Update a goal                                                    |
| `cup goal-delete <goalId>`               | Delete a goal                                                    |
| `cup key-result-create <goalId> <name>`  | Create a key result on a goal                                    |
| `cup key-result-update <keyResultId>`    | Update a key result                                              |
| `cup key-result-delete <keyResultId>`    | Delete a key result                                              |
| `cup list-from-template <name>`          | Create a list from a template                                    |
| `cup view-create <listId> <name>`        | Create a view on a list                                          |
| `cup view-update <viewId>`               | Update a view                                                    |
| `cup view-delete <viewId>`               | Delete a view                                                    |
| `cup chat send <channelId>`              | Send a message to a channel                                      |
| `cup chat channel-create <name>`         | Create a new chat channel                                        |
| `cup chat dm <userIds...>`               | Create or open a DM                                              |
| `cup chat channel-update <channelId>`    | Update a channel                                                 |
| `cup chat channel-delete <channelId>`    | Delete a channel                                                 |
| `cup chat reply <messageId>`             | Reply to a message                                               |
| `cup chat react <messageId>`             | Add a reaction to a message                                      |
| `cup chat unreact <messageId>`           | Remove a reaction from a message                                 |
| `cup chat message-update <messageId>`    | Edit a message                                                   |
| `cup chat message-delete <messageId>`    | Delete a message                                                 |
| **Configuration**                        |                                                                  |
| `cup favorite add <type> <id> [alias]`   | Add a favorite                                                   |
| `cup favorite remove <alias>`            | Remove a favorite                                                |
| `cup profile`                            | Manage profiles                                                  |
| `cup config`                             | Manage CLI configuration                                         |
| `cup completion <shell>`                 | Output shell completion script                                   |

<!-- quick-reference:end -->

---

## Read Commands

### `cup init`

First-time setup. In interactive mode, prompts for your API token, verifies it, auto-detects your workspace, and writes `~/.config/cup/config.json`. In non-interactive mode, pass `--token` and `--team` to skip prompts. Automatically migrates config from `~/.config/cu/` if present.

```bash
# Interactive (prompts for token and workspace)
cup init

# Non-interactive (for CI, scripts, AI agents)
cup init --token pk_abc123 --team 12345678
```

| Flag              | Description                                   |
| ----------------- | --------------------------------------------- |
| `--token <token>` | API token (pk\_...) for non-interactive setup |
| `--team <teamId>` | Workspace/team ID for non-interactive setup   |

### `cup skill`

Install the agent skill file for your coding agents. Auto-detects installed agents (Claude Code, Codex, OpenCode) and writes the skill to each detected location. Run it again after updating `cup` to refresh the skill content.

```bash
cup skill                                            # install to detected agents
cup skill --print                                    # preview the skill content
cup skill --path ~/.claude/skills/clickup/SKILL.md   # install to a specific path
```

| Flag            | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `--print`       | Print the skill content to stdout instead of installing       |
| `--path <path>` | Install to a specific path instead of auto-detected locations |

### `cup tasks`

List tasks assigned to you by default. Use `--all` to include all assignees. Shows all task types by default; use `--type` to filter by task type.

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
cup tasks --assignee me
cup tasks --tag "bug" --status "to do"
cup tasks --due-before 2026-04-01
cup tasks --created-after 2026-03-01
cup tasks --list 123 --field "Sprint" "Week 1"
cup tasks --json
```

| Flag                      | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| `--status <status>`       | Filter by status (e.g. "in progress")                           |
| `--list <listId>`         | Filter by list ID                                               |
| `--space <spaceId\|name>` | Filter by space ID or name (partial match)                      |
| `--name <partial>`        | Filter by name (case-insensitive contains)                      |
| `--type <type>`           | Filter by task type (e.g. "task", "initiative", custom name/ID) |
| `--all`                   | Include all tasks, not just mine                                |
| `--include-closed`        | Include done/closed tasks                                       |
| `--assignee <userId>`     | Filter by assignee (user ID or "me")                            |
| `--tag <tag>`             | Filter by tag name                                              |
| `--due-before <date>`     | Tasks due before date (YYYY-MM-DD)                              |
| `--due-after <date>`      | Tasks due after date (YYYY-MM-DD)                               |
| `--created-after <date>`  | Tasks created after date (YYYY-MM-DD)                           |
| `--created-before <date>` | Tasks created before date (YYYY-MM-DD)                          |
| `--field <name> <value>`  | Filter by custom field (requires `--list`)                      |
| `--json`                  | Force JSON output                                               |

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

Get task details including custom fields, checklists, dependencies, and linked tasks. Pretty summary in terminal, Markdown when piped.

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

List comments on a task. Formatted view in terminal, Markdown when piped.

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

| Flag               | Description                                         |
| ------------------ | --------------------------------------------------- |
| `--name <partial>` | Filter lists by partial name match                  |
| `--archived`       | Include only archived items (default: active items) |
| `--json`           | Force JSON output                                   |

### `cup spaces`

List spaces in your workspace. Useful for getting space IDs for the `--space` filter.

```bash
cup spaces
cup spaces --name "eng"
cup spaces --my
cup spaces --json
```

| Flag               | Description                                         |
| ------------------ | --------------------------------------------------- |
| `--name <partial>` | Filter spaces by partial name match                 |
| `--my`             | Show only spaces where I have assigned tasks        |
| `--archived`       | Include only archived items (default: active items) |
| `--json`           | Force JSON output                                   |

### `cup open <query>`

Open a task in the browser. Accepts a task ID or partial name.

```bash
cup open abc123
cup open "login bug"
cup open abc123 --json
```

If the query matches multiple tasks by name, all matches are listed and the first is opened.

### `cup search <query>`

Search tasks assigned to you by default. Use `--all` to search across all assignees. Supports multi-word queries with case-insensitive matching. Status filter supports fuzzy matching.

```bash
cup search "login bug"
cup search auth
cup search "payment flow" --json
cup search auth --status "prog"     # fuzzy matches "in progress"
cup search "old task" --include-closed
cup search "payment" --all          # search all workspace tasks
cup search "auth" --list 123 --space 456
cup search "bug" --tag "frontend" --due-before 2026-04-01
cup search "sprint" --list 123 --field "Sprint" "Week 1"
```

| Flag                      | Description                                |
| ------------------------- | ------------------------------------------ |
| `--status <s>`            | Filter by status, supports fuzzy matching  |
| `--list <listId>`         | Filter by list ID                          |
| `--space <spaceId\|name>` | Filter by space ID or name (partial match) |
| `--all`                   | Search all workspace tasks, not just mine  |
| `--include-closed`        | Include done/closed tasks                  |
| `--assignee <userId>`     | Filter by assignee (user ID or "me")       |
| `--tag <tag>`             | Filter by tag name                         |
| `--due-before <date>`     | Tasks due before date (YYYY-MM-DD)         |
| `--due-after <date>`      | Tasks due after date (YYYY-MM-DD)          |
| `--created-after <date>`  | Tasks created after date (YYYY-MM-DD)      |
| `--created-before <date>` | Tasks created before date (YYYY-MM-DD)     |
| `--field <name> <value>`  | Filter by custom field (requires `--list`) |
| `--json`                  | Force JSON output                          |

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
cup overdue --all
cup overdue --json
```

| Flag               | Description                              |
| ------------------ | ---------------------------------------- |
| `--include-closed` | Include done/closed overdue tasks        |
| `--all`            | Check all workspace tasks, not just mine |
| `--json`           | Force JSON output                        |

### `cup time-in-status <taskId>`

Show how long a task has been in each status. Useful for tracking cycle time or spotting tasks stuck in review.

```bash
cup time-in-status abc123
cup time-in-status abc123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup auth`

Check authentication status. Validates your API token and shows your user info.

```bash
cup auth
cup auth --json
```

### `cup docs [query]`

List docs in your workspace. Optionally filter by name.

```bash
cup docs
cup docs "design"
cup docs --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup doc <docId> [pageId]`

View a doc's metadata and page tree (when pageId is omitted), or a specific page's content (when pageId is provided).

```bash
cup doc abc123                    # doc metadata + page tree
cup doc abc123 page456            # specific page content
cup doc abc123 --json             # doc metadata as JSON
cup doc abc123 page456 --json     # page content as JSON
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup doc-pages <docId>`

List all pages in a doc with their full content. Useful for dumping an entire doc.

```bash
cup doc-pages abc123
cup doc-pages abc123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup folders <spaceId>`

List folders in a space with their contained lists. Useful for discovering folder and list IDs.

```bash
cup folders <spaceId>
cup folders <spaceId> --name "sprint"
cup folders <spaceId> --json
```

| Flag               | Description                                         |
| ------------------ | --------------------------------------------------- |
| `--name <partial>` | Filter folders by partial name match                |
| `--archived`       | Include only archived items (default: active items) |
| `--json`           | Force JSON output                                   |

---

## Write Commands

### `cup update <id>`

Update a task. Provide at least one of: `--name`, `--description`, `--status`, `--priority`, `--due-date`, `--start-date`, `--time-estimate`, `--assignee`, `--remove-assignee`, `--parent`, `--detach`, `--archive`, `--unarchive`, `--type`, `--field`.

```bash
cup update abc123 -s "in progress"
cup update abc123 -n "New task name"
cup update abc123 -d "Updated description with **markdown**"
cup update abc123 -d $'## Section\n\nUse `copy()` here.\n- Item 1\n- Item 2'  # backticks + newlines
cup update abc123 --priority high
cup update abc123 --due-date 2025-03-15
cup update abc123 --due-date none         # clear due date
cup update abc123 --start-date 2025-03-01
cup update abc123 --assignee me
cup update abc123 --assignee 12345
cup update abc123 --remove-assignee me
cup update abc123 --assignee 99 --remove-assignee 12345
cup update abc123 -n "New name" -s "done" --priority urgent
cup update abc123 --time-estimate 2h
cup update abc123 --parent parentTaskId   # make it a subtask
cup update abc123 --detach                # remove parent (promote to top-level)
cup update abc123 --archive               # archive a task
cup update abc123 --unarchive             # unarchive a task
cup update abc123 --type Initiative       # change task type by name
cup update abc123 --type 1                # change task type by custom_item_id
cup update abc123 --field "Story Points" 5
cup update abc123 --field "Priority" "High" --field "Tags" "bug"
cup update abc123 -s "in progress" --json
```

`--field "Name" value` updates a custom field inline as part of the update. Field names are resolved via the task's list using the same parser as `cup field --set` (text, number, checkbox, dropdown name, labels, date, url, email, etc.). Repeat the flag to set multiple fields.

| Flag                         | Description                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `-n, --name <text>`          | New task name                                                                     |
| `-d, --description <text>`   | New description (markdown supported). Use `$'...'` quoting for backticks/newlines |
| `-s, --status <status>`      | New status, supports fuzzy matching (e.g. `"prog"` matches `"in progress"`)       |
| `--priority <level>`         | Priority: `urgent`, `high`, `normal`, `low` (or 1-4)                              |
| `--due-date <date>`          | Due date (`YYYY-MM-DD`), or `"none"`/`"clear"` to remove                          |
| `--start-date <date>`        | Start date (`YYYY-MM-DD`)                                                         |
| `--time-estimate <duration>` | Time estimate (e.g. `"2h"`, `"30m"`, `"1h30m"`)                                   |
| `--assignee <userId>`        | Add assignee by user ID or `"me"`                                                 |
| `--remove-assignee <userId>` | Remove assignee by user ID or `"me"`                                              |
| `--parent <taskId>`          | Set parent task (makes this a subtask)                                            |
| `--detach`                   | Remove parent task (promote subtask to top-level)                                 |
| `--archive`                  | Archive the task                                                                  |
| `--unarchive`                | Unarchive the task                                                                |
| `--type <type>`              | Change task type (name or custom_item_id)                                         |
| `--field <name> <value>`     | Set custom field inline (repeatable; resolves field names via the task's list)    |
| `--json`                     | Force JSON output even in terminal                                                |

### `cup create`

Create a new task. If `--parent` is given, list is auto-detected from the parent task.

```bash
cup create -n "Fix login bug" -l <listId>
cup create -n "Subtask name" -p <parentTaskId>    # --list auto-detected
cup create -n "Task" -l <listId> -d "desc" -s "open"
cup create -n "Task" -l <listId> -d $'## Overview\n\nCall `init()` first.\n- Step 1\n- Step 2'
cup create -n "Task" -l <listId> --priority high --due-date 2025-06-01
cup create -n "Task" -l <listId> --assignee me --tags "bug,frontend"
cup create -n "Initiative" -l <listId> --custom-item-id 1
cup create -n "Task" -l <listId> --time-estimate 2h
cup create -n "Bug fix" -l <listId> --field "Story Points" 5 --field "Stage" "In Review"
cup create -n "From Template" -l <listId> --template <templateId>
cup create -n "Bug fix" -l sprint:current         # create in active sprint
cup create -n "Fix bug" -l <listId> --json
```

`sprint:current` is a pseudo-ID that auto-resolves to the active sprint list using the same detection chain as `cup sprint` (`--folder` flag > `sprintFolderId` config > favorited sprint-folders > auto-detection).

`--field "Name" value` sets custom fields inline as part of task creation. Field names are resolved once against the target list via `GET /list/{id}/field`, so the values land in the initial create payload instead of requiring a follow-up `cup field --set` call. Repeat the flag to set multiple fields. Value parsing matches `cup field --set` (text, number, checkbox, dropdown name, labels, date, url, email, etc.).

| Flag                         | Required         | Description                                                         |
| ---------------------------- | ---------------- | ------------------------------------------------------------------- |
| `-n, --name <name>`          | yes              | Task name                                                           |
| `-l, --list <listId>`        | if no `--parent` | Target list ID (accepts `sprint:current` pseudo-ID)                 |
| `-p, --parent <taskId>`      | no               | Parent task (list auto-detected)                                    |
| `-d, --description <text>`   | no               | Description (markdown). Use `$'...'` quoting for backticks/newlines |
| `-s, --status <status>`      | no               | Initial status                                                      |
| `--priority <level>`         | no               | Priority: `urgent`, `high`, `normal`, `low` (or 1-4)                |
| `--due-date <date>`          | no               | Due date (`YYYY-MM-DD`)                                             |
| `--start-date <date>`        | no               | Start date (`YYYY-MM-DD`)                                           |
| `--time-estimate <duration>` | no               | Time estimate (e.g. `"2h"`, `"30m"`, `"1h30m"`)                     |
| `--assignee <userId>`        | no               | Assignee by user ID or `"me"`                                       |
| `--tags <tags>`              | no               | Comma-separated tag names                                           |
| `--custom-item-id <id>`      | no               | Custom task type ID (e.g. for creating initiatives)                 |
| `--template <id>`            | no               | Create from a task template (use `cup templates` to find IDs)       |
| `--field <name> <value>`     | no               | Set custom field inline (repeatable)                                |
| `--json`                     | no               | Force JSON output even in terminal                                  |

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
cup field abc123 --set "Priority Labels" "High, Medium"
cup field abc123 --set "Rating" 3
cup field abc123 --set "Progress" 75
cup field abc123 --set "Related Tasks" "task1, task2"
cup field abc123 --set "Reviewers" "123, 456"
cup field abc123 --remove "Priority Level"
cup field abc123 --set "Points" 3 --remove "Old Field"
cup field abc123 --set "Points" 3 --json
```

| Flag                       | Description                                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--set "Field Name" <val>` | Set a custom field by name. Supports: text, number, checkbox (true/false), dropdown (option name), labels (comma-separated names), date (YYYY-MM-DD), url, email, emoji/rating (0-5), manual_progress (0-100), tasks/relationship (comma-separated task IDs), users/people (comma-separated user IDs) |
| `--remove "Field Name"`    | Remove a custom field value                                                                                                                                                                                                                                                                           |
| `--json`                   | Force JSON output                                                                                                                                                                                                                                                                                     |

Both `--set` and `--remove` can be used together in one invocation.

### `cup field-create <name>`

Create a custom field in your workspace. Requires specifying the field type.

```bash
cup field-create "Story Points" -t number
cup field-create "Priority Level" -t drop_down
cup field-create "Approved" -t checkbox --required
cup field-create "Notes" -t text -d "Internal notes for the team"
cup field-create "Contact Email" -t email --json
```

| Flag                | Required | Description                                                                                          |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `-t, --type <type>` | yes      | Field type: text, short_text, number, date, checkbox, drop_down, labels, email, phone, url, currency |
| `-d, --description` | no       | Field description                                                                                    |
| `--required`        | no       | Make the field required                                                                              |
| `--json`            | no       | Force JSON output                                                                                    |

### `cup comment <id>`

Post a comment on a task. Markdown formatting in the message is automatically converted to ClickUp rich text (bold, italic, headers, lists, code blocks, links, etc.).

```bash
cup comment abc123 -m "Addressed in PR #42"
cup comment abc123 -m "## Results\n\n**Passed**: 15/15\n- Unit tests\n- Integration"
cup comment abc123 -m "Done" --notify-all
cup comment abc123 -m "Done" --json
```

| Flag            | Required | Description                            |
| --------------- | -------- | -------------------------------------- |
| `-m, --message` | yes      | Comment text (markdown auto-converted) |
| `--notify-all`  | no       | Notify all task assignees              |
| `--json`        | no       | Force JSON output                      |

### `cup comment-edit <commentId>`

Edit an existing comment on a task. Provide `--message`, `--resolved`, or `--unresolved` (or any combination). Markdown in the message is automatically converted to rich text.

```bash
cup comment-edit <commentId> -m "Updated text"
cup comment-edit <commentId> -m "Fixed" --resolved
cup comment-edit <commentId> --resolved
cup comment-edit <commentId> -m "Reopening" --unresolved
cup comment-edit <commentId> -m "Updated" --json
```

| Flag            | Required | Description                |
| --------------- | -------- | -------------------------- |
| `-m, --message` | no       | New comment text           |
| `--resolved`    | no       | Mark comment as resolved   |
| `--unresolved`  | no       | Mark comment as unresolved |
| `--json`        | no       | Force JSON output          |

### `cup comment-delete [commentId]`

Delete a comment by ID, or use `--task` with `--mine` to find and delete your comment from a task.

```bash
cup comment-delete 12345
cup comment-delete 12345 --json
cup comment-delete --task abc123 --mine
cup comment-delete --task abc123 --mine --match "report uploaded"
```

| Flag              | Required | Description                                                  |
| ----------------- | -------- | ------------------------------------------------------------ |
| `--task <taskId>` | no       | Task to search for your comment (requires `--mine`)          |
| `--mine`          | no       | Delete one of my comments from the specified task            |
| `--match <text>`  | no       | Only match comments containing this text (requires `--mine`) |
| `--json`          | no       | Force JSON output                                            |

### `cup replies <commentId>`

List threaded replies on a comment.

```bash
cup replies 12345
cup replies 12345 --json
```

### `cup reply <commentId>`

Reply to a comment. Markdown in the message is automatically converted to rich text.

```bash
cup reply 12345 -m "Agreed, will fix"
cup reply 12345 -m "Done" --json
```

| Flag            | Required | Description                          |
| --------------- | -------- | ------------------------------------ |
| `-m, --message` | yes      | Reply text (markdown auto-converted) |
| `--notify-all`  | no       | Notify all task assignees            |
| `--json`        | no       | Force JSON output                    |

### `cup archive <taskId>`

Archive or unarchive a task. In TTY mode prompts for confirmation unless `--confirm` is passed.

```bash
cup archive abc123
cup archive abc123 --confirm
cup archive abc123 --unarchive
cup archive abc123 --unarchive --confirm
cup archive abc123 --json
```

| Flag          | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `--unarchive` | Unarchive instead of archiving                              |
| `--confirm`   | Skip confirmation prompt (required in non-interactive mode) |
| `--json`      | Force JSON output                                           |

### `cup assign <id>`

Assign or unassign users from a task. Supports `me` as shorthand for your user ID. Both `--to` and `--remove` accept a comma-separated list of user IDs to add or remove multiple assignees in a single call.

```bash
cup assign abc123 --to 12345
cup assign abc123 --to me
cup assign abc123 --remove 12345
cup assign abc123 --to me --remove 67890
cup assign abc123 --to user1,user2,user3
cup assign abc123 --remove user1,user2
cup assign abc123 --to "me,12345" --json
```

| Flag                 | Description                                   |
| -------------------- | --------------------------------------------- |
| `--to <userIds>`     | Add assignee(s) (comma-separated, or `me`)    |
| `--remove <userIds>` | Remove assignee(s) (comma-separated, or `me`) |
| `--json`             | Force JSON output                             |

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

Deleting task attachments is not currently supported because the public ClickUp API exposes upload endpoints, but not an attachment delete endpoint.

### `cup move <id>`

Add or remove a task from a list. Tasks can belong to multiple lists in ClickUp.

```bash
cup move abc123 --to <listId>                    # add task to a list
cup move abc123 --remove <listId>                # remove task from a list
cup move abc123 --to <newListId> --remove <oldListId>  # move between lists
cup move abc123 --to sprint:current              # move to active sprint
cup move abc123 --to sprint:current --remove <oldListId>
cup move abc123 --to <listId> --json
```

`sprint:current` is a pseudo-ID that auto-resolves to the active sprint list using the same detection chain as `cup sprint` (`--folder` flag > `sprintFolderId` config > favorited sprint-folders > auto-detection).

| Flag                | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `--to <listId>`     | Add task to this list (accepts `sprint:current` pseudo-ID) |
| `--remove <listId>` | Remove task from this list                                 |
| `--json`            | Force JSON output                                          |

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
cup checklist add-item <clId> "Sub step" --parent <itemId>   # nest under parent
cup checklist edit-item <clId> <itemId> --resolved   # mark item done
cup checklist edit-item <clId> <itemId> --parent <newParent> # reparent (use "null" to unnest)
cup checklist delete-item <clId> <itemId>            # remove an item
```

| Subcommand    | Arguments                        | Description           |
| ------------- | -------------------------------- | --------------------- |
| `view`        | `<taskId>`                       | Show all checklists   |
| `create`      | `<taskId> <name>`                | Create a checklist    |
| `delete`      | `<checklistId>`                  | Delete a checklist    |
| `add-item`    | `<checklistId> <name> [flags]`   | Add checklist item    |
| `edit-item`   | `<checklistId> <itemId> [flags]` | Edit checklist item   |
| `delete-item` | `<checklistId> <itemId>`         | Delete checklist item |

`add-item` flags: `--parent <itemId>` to nest under a parent item. `edit-item` flags: `--name <text>`, `--resolved`, `--unresolved`, `--assignee <userId>`, `--parent <itemId>` (pass `"null"` to unnest). All subcommands support `--json`.

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

List recent time entries. Defaults to the current user's entries (last 7 days). Use `--all` to show all team entries.

**Breaking change:** previously returned all team entries by default. Now returns only the authenticated user's entries unless `--all` is passed.

```bash
cup time list
cup time list --all           # all team entries
cup time list --days 14
cup time list --task abc123
cup time list --space <spaceId>
cup time list --list <listId>
cup time list --assignee <userId>
cup time list --days 7 --json
```

| Flag                  | Required | Description                                |
| --------------------- | -------- | ------------------------------------------ |
| `--days <n>`          | no       | Number of days to look back (default: 7)   |
| `--task <taskId>`     | no       | Filter entries by task ID                  |
| `--space <spaceId>`   | no       | Filter entries by space ID                 |
| `--list <listId>`     | no       | Filter entries by list ID                  |
| `--assignee <userId>` | no       | Filter entries by assignee user ID         |
| `--all`               | no       | Show all team entries (default: only mine) |
| `--json`              | no       | Force JSON output                          |

### `cup time update <timeEntryId>`

Update a time entry's description or duration.

```bash
cup time update te123 -d "Updated description"
cup time update te123 --duration 3h
cup time update te123 -d "Review" --duration 1h30m --json
```

| Flag                    | Required   | Description                     |
| ----------------------- | ---------- | ------------------------------- |
| `-d, --description`     | one of two | New description                 |
| `--duration <duration>` | one of two | New duration (e.g. "2h", "30m") |
| `--json`                | no         | Force JSON output               |

### `cup time delete <timeEntryId>`

Delete a time entry.

```bash
cup time delete te123
cup time delete te123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup tags <spaceId>`

List tags available in a space. Useful for discovering valid tag names for `cup tag`.

```bash
cup tags <spaceId>
cup tags <spaceId> --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup space-create <name>`

Create a new space in your workspace.

```bash
cup space-create "Engineering"
cup space-create "Design" --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup list-create <spaceId> <name>`

Create a new list in a space. Optionally create it inside a folder with `--folder`. Use `--copy-statuses-from` to copy the status set from an existing list or space.

```bash
cup list-create <spaceId> "Backlog"
cup list-create <spaceId> "Sprint 1" --folder <folderId>
cup list-create <spaceId> "Tasks" --json
cup list-create <spaceId> "Sprint 5" --copy-statuses-from <existingListId>
cup list-create <spaceId> "New List" --copy-statuses-from <spaceId>
```

| Flag                        | Required | Description                                |
| --------------------------- | -------- | ------------------------------------------ |
| `--folder <folderId>`       | no       | Create the list inside a folder            |
| `--copy-statuses-from <id>` | no       | Copy status set from this list or space ID |
| `--json`                    | no       | Force JSON output                          |

### `cup folder-create <spaceId> <name>`

Create a new folder in a space.

```bash
cup folder-create <spaceId> "Q2 Work"
cup folder-create <spaceId> "Sprints" --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup list-rename <listId> <newName>`

Rename a list. Wraps the `PUT /list/{id}` endpoint with a name-only payload, so statuses, content, and other list settings are left untouched.

```bash
cup list-rename <listId> "Sprint 12"
cup list-rename <listId> "Backlog (Archived)" --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup folder-rename <folderId> <newName>`

Rename a folder. Wraps the `PUT /folder/{id}` endpoint with a name-only payload.

```bash
cup folder-rename <folderId> "Q3 Work"
cup folder-rename <folderId> "Sprints" --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup space-rename <spaceId> <newName>`

Rename a space. Wraps the `PUT /space/{id}` endpoint with a name-only payload, leaving features and statuses untouched.

```bash
cup space-rename <spaceId> "Engineering"
cup space-rename <spaceId> "Design System" --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup doc-create <title>`

Create a new doc in your workspace.

```bash
cup doc-create "Architecture Notes"
cup doc-create "Draft" -c "# Initial content"
cup doc-create "Plan" --json
```

| Flag            | Required | Description                |
| --------------- | -------- | -------------------------- |
| `-c, --content` | no       | Initial content (markdown) |
| `--json`        | no       | Force JSON output          |

### `cup doc-page-create <docId> <name>`

Create a page in a doc. Optionally nest under a parent page.

```bash
cup doc-page-create abc123 "Getting Started"
cup doc-page-create abc123 "Setup" -c "# Setup guide"
cup doc-page-create abc123 "Sub Section" --parent-page page456
cup doc-page-create abc123 "Page" --json
```

| Flag                     | Required | Description                |
| ------------------------ | -------- | -------------------------- |
| `-c, --content`          | no       | Page content (markdown)    |
| `--parent-page <pageId>` | no       | Parent page ID for nesting |
| `--json`                 | no       | Force JSON output          |

### `cup doc-page-edit <docId> <pageId>`

Edit a doc page name or content. Provide at least `--name` or `--content`.

```bash
cup doc-page-edit abc123 page456 --name "Renamed Section"
cup doc-page-edit abc123 page456 -c "# Updated content"
cup doc-page-edit abc123 page456 --name "New Name" -c "# New body"
cup doc-page-edit abc123 page456 --name "Renamed" --json
```

| Flag            | Required   | Description                 |
| --------------- | ---------- | --------------------------- |
| `--name <text>` | one of two | New page name               |
| `-c, --content` | one of two | New page content (markdown) |
| `--json`        | no         | Force JSON output           |

### `cup tag-create <spaceId> <name>`

Create a tag in a space.

```bash
cup tag-create <spaceId> "bug"
cup tag-create <spaceId> "urgent" --fg "#ffffff" --bg "#ff0000"
cup tag-create <spaceId> "feature" --json
```

| Flag           | Required | Description            |
| -------------- | -------- | ---------------------- |
| `--fg <color>` | no       | Foreground color (hex) |
| `--bg <color>` | no       | Background color (hex) |
| `--json`       | no       | Force JSON output      |

### `cup tag-delete <spaceId> <name>`

Delete a tag from a space.

```bash
cup tag-delete <spaceId> "old-tag"
cup tag-delete <spaceId> "deprecated" --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup members`

List workspace members with username, ID, and email.

```bash
cup members
cup members --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup fields <listId>`

List custom fields available on a list. Shows field name, type, required status, and dropdown options.

```bash
cup fields <listId>
cup fields <listId> --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup duplicate <taskId>`

Duplicate a task. Creates a copy with "(copy)" appended to the name. Copies description, priority, tags, and time estimate. The new task is created in the same list.

```bash
cup duplicate abc123
cup duplicate abc123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup task-types`

List custom task types in your workspace. Useful for discovering valid `--custom-item-id` values.

```bash
cup task-types
cup task-types --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup templates`

List task templates in your workspace. Useful for discovering template IDs for `cup create --template`.

```bash
cup templates
cup templates --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup bulk status <status> <taskIds...>`

Update the status of multiple tasks at once. Failed updates are reported but don't stop the operation.

```bash
cup bulk status "done" t1 t2 t3
cup bulk status "in progress" t1 t2 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup bulk assign <taskIds...>`

Bulk assign or unassign a user from multiple tasks. Use `--to` to add a user and `--remove` to unassign. Failed updates are reported but don't stop the operation.

```bash
cup bulk assign t1 t2 t3 --to 12345
cup bulk assign t1 t2 --to me
cup bulk assign t1 t2 t3 --remove 12345 --json
```

| Flag                | Required | Description                        |
| ------------------- | -------- | ---------------------------------- |
| `--to <userId>`     | one of   | Add this user (user ID or "me")    |
| `--remove <userId>` | one of   | Remove this user (user ID or "me") |
| `--json`            | no       | Force JSON output                  |

### `cup bulk due-date <date> <taskIds...>`

Bulk set or clear the due date on multiple tasks. Use `none` or `clear` to remove due dates. Failed updates are reported but don't stop the operation.

```bash
cup bulk due-date 2025-12-31 t1 t2 t3
cup bulk due-date none t1 t2
cup bulk due-date clear t1 t2 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup bulk tag <tagName> <taskIds...>`

Bulk add or remove a tag from multiple tasks. Defaults to adding; use `--remove` to remove the tag. Failed updates are reported but don't stop the operation.

```bash
cup bulk tag bug t1 t2 t3
cup bulk tag bug t1 t2 --remove
cup bulk tag frontend t1 t2 --json
```

| Flag       | Required | Description                  |
| ---------- | -------- | ---------------------------- |
| `--remove` | no       | Remove tag instead of adding |
| `--json`   | no       | Force JSON output            |

### `cup bulk priority <taskIds...>`

Bulk set the priority on multiple tasks. Accepts `urgent`, `high`, `normal`, `low`, or the numeric values `1`-`4`. Updates run in parallel (up to 5 at a time) and failed updates are reported but don't stop the operation.

```bash
cup bulk priority t1 t2 t3 --to urgent
cup bulk priority t1 t2 --to 2
cup bulk priority t1 t2 t3 --to low --json
```

| Flag              | Required | Description                                 |
| ----------------- | -------- | ------------------------------------------- |
| `--to <priority>` | yes      | Priority: urgent, high, normal, low, or 1-4 |
| `--json`          | no       | Force JSON output                           |

### `cup bulk field <taskIds...>`

Bulk set the same custom field value on multiple tasks. Resolves the field name against the first task in the list, then applies the parsed value to every task in parallel (up to 5 at a time). Uses the same value parsing as `cup field --set` (text, number, checkbox, dropdown name, labels, date, url, email, etc.). Failed updates are reported but don't stop the operation.

```bash
cup bulk field t1 t2 t3 --set "Story Points" 5
cup bulk field t1 t2 --set "Stage" "In Review"
cup bulk field t1 t2 t3 --set "Notes" "batch update" --json
```

| Flag                   | Required | Description                 |
| ---------------------- | -------- | --------------------------- |
| `--set <name> <value>` | yes      | Field name and value to set |
| `--json`               | no       | Force JSON output           |

### `cup bulk move <taskIds...>`

Move multiple tasks to a single destination list in parallel (up to 5 at a time). Wraps the same v3 `home_list` endpoint as `cup move --to <new> --remove <old>`, so each task's home list is updated and statuses are mapped to the destination list when they don't match. Failed moves are reported but don't stop the operation.

```bash
cup bulk move t1 t2 t3 --to <listId>
cup bulk move t1 t2 --to <listId> --json
```

| Flag            | Required | Description         |
| --------------- | -------- | ------------------- |
| `--to <listId>` | yes      | Destination list ID |
| `--json`        | no       | Force JSON output   |

### `cup goals`

List goals in your workspace with name, progress percentage, and owner.

```bash
cup goals
cup goals --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup goal-create <name>`

Create a goal in your workspace.

```bash
cup goal-create "Ship v2"
cup goal-create "Reduce bugs" -d "Track bug count reduction"
cup goal-create "Q4 OKR" --color "#00ff00" --due-date 2025-12-31 --json
```

| Flag                       | Required | Description           |
| -------------------------- | -------- | --------------------- |
| `-d, --description <text>` | no       | Goal description      |
| `--color <hex>`            | no       | Goal color (hex)      |
| `--due-date <date>`        | no       | Due date (YYYY-MM-DD) |
| `--json`                   | no       | Force JSON output     |

### `cup goal-update <goalId>`

Update a goal's name, description, or color.

```bash
cup goal-update g123 -n "Updated Goal Name"
cup goal-update g123 -d "New description"
cup goal-update g123 --color "#ff0000" --json
```

| Flag                       | Required | Description       |
| -------------------------- | -------- | ----------------- |
| `-n, --name <text>`        | no       | New goal name     |
| `-d, --description <text>` | no       | New description   |
| `--color <hex>`            | no       | New color (hex)   |
| `--json`                   | no       | Force JSON output |

### `cup key-results <goalId>`

List key results for a goal with progress tracking.

```bash
cup key-results g123
cup key-results g123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup key-result-create <goalId> <name>`

Create a key result on a goal.

```bash
cup key-result-create g123 "Complete API endpoints"
cup key-result-create g123 "Coverage" --type percentage --target 80
cup key-result-create g123 "Ship features" --type number --target 10 --json
```

| Flag            | Required | Description                                      |
| --------------- | -------- | ------------------------------------------------ |
| `--type <type>` | no       | Type: `number` or `percentage` (default: number) |
| `--target <n>`  | no       | Target value (default: 100)                      |
| `--json`        | no       | Force JSON output                                |

### `cup key-result-update <keyResultId>`

Update a key result's progress or add a note.

```bash
cup key-result-update kr123 --progress 7
cup key-result-update kr123 --note "Completed 3 more items"
cup key-result-update kr123 --progress 10 --note "Done!" --json
```

| Flag             | Required | Description       |
| ---------------- | -------- | ----------------- |
| `--progress <n>` | no       | Current progress  |
| `--note <text>`  | no       | Progress note     |
| `--json`         | no       | Force JSON output |

### `cup goal-delete <goalId>`

Delete a goal.

```bash
cup goal-delete g123
cup goal-delete g123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup key-result-delete <keyResultId>`

Delete a key result.

```bash
cup key-result-delete kr123
cup key-result-delete kr123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup doc-delete <docId>`

Delete a doc.

```bash
cup doc-delete abc123
cup doc-delete abc123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup doc-page-delete <docId> <pageId>`

Delete a doc page.

```bash
cup doc-page-delete abc123 page456
cup doc-page-delete abc123 page456 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup tag-update <spaceId> <tagName>`

Update a tag in a space. Provide at least one of `--name`, `--fg`, or `--bg`.

```bash
cup tag-update <spaceId> "old-name" --name "new-name"
cup tag-update <spaceId> "bug" --name "defect" --fg "#fff" --bg "#f00"
cup tag-update <spaceId> "tag" --fg "#ffffff" --bg "#cc0000"
cup tag-update <spaceId> "tag" --name "renamed" --json
```

| Flag            | Required | Description                |
| --------------- | -------- | -------------------------- |
| `--name <text>` | no       | New tag name               |
| `--fg <color>`  | no       | New foreground color (hex) |
| `--bg <color>`  | no       | New background color (hex) |
| `--json`        | no       | Force JSON output          |

### `cup list-templates`

List list templates in your workspace.

```bash
cup list-templates
cup list-templates --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup folder-templates`

List folder templates in your workspace.

```bash
cup folder-templates
cup folder-templates --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup list-from-template <name>`

Create a list from a list template. Specify where to create the list with `--space` or `--folder`.

```bash
cup list-from-template "Sprint Board" --template <id> --space <spaceId>
cup list-from-template "Backlog" --template <id> --folder <folderId>
cup list-from-template "Tasks" --template <id> --space <spaceId> --json
```

| Flag                  | Required | Description                                  |
| --------------------- | -------- | -------------------------------------------- |
| `--template <id>`     | yes      | Template ID (find with `cup list-templates`) |
| `--space <spaceId>`   | one of   | Create the list in this space                |
| `--folder <folderId>` | one of   | Create the list in this folder               |
| `--json`              | no       | Force JSON output                            |

### `cup views <id>`

List views on a list, space, folder, or workspace. Defaults to list-level views.

```bash
cup views <listId>
cup views <spaceId> --space
cup views <folderId> --folder
cup views any --workspace
cup views <listId> --json
```

| Flag          | Required | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| `--space`     | no       | Treat `<id>` as a space ID                  |
| `--folder`    | no       | Treat `<id>` as a folder ID                 |
| `--workspace` | no       | List workspace-level views (ignores `<id>`) |
| `--json`      | no       | Force JSON output                           |

### `cup view <viewId>`

Get view details including type, visibility, and creation date.

```bash
cup view <viewId>
cup view <viewId> --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup view-create <listId> <name>`

Create a view on a list.

```bash
cup view-create <listId> "Sprint Board" -t board
cup view-create <listId> "Calendar" -t calendar
cup view-create <listId> "Status Board" -t board --group-by status
cup view-create <listId> "Team View" -t board --group-by assignee --json
```

| Flag         | Required | Description                                                 |
| ------------ | -------- | ----------------------------------------------------------- |
| `-t, --type` | yes      | View type: list, board, calendar, gantt, table, timeline    |
| `--group-by` | no       | Group by: status, assignee, priority, due_date, tag, sprint |
| `--json`     | no       | Force JSON output                                           |

### `cup view-update <viewId>`

Update a view's name or grouping.

```bash
cup view-update <viewId> -n "New Name"
cup view-update <viewId> --group-by priority
cup view-update <viewId> -n "Updated" --group-by assignee --json
```

| Flag         | Required | Description                                                 |
| ------------ | -------- | ----------------------------------------------------------- |
| `-n, --name` | no       | New view name                                               |
| `--group-by` | no       | Group by: status, assignee, priority, due_date, tag, sprint |
| `--json`     | no       | Force JSON output                                           |

### `cup view-delete <viewId>`

Delete a view. **DESTRUCTIVE - cannot be undone.**

```bash
cup view-delete <viewId>
cup view-delete <viewId> --confirm
cup view-delete <viewId> --confirm --json
```

In TTY mode without `--confirm`: shows the view name and prompts for confirmation (default: No). In non-interactive/piped mode, `--confirm` is required.

| Flag        | Required | Description                                                 |
| ----------- | -------- | ----------------------------------------------------------- |
| `--confirm` | no       | Skip confirmation prompt (required in non-interactive mode) |
| `--json`    | no       | Force JSON output                                           |

---

## Saved Filters

Saved filters let you store frequently used `cup` commands under a short name and re-run them with `cup filter run <name>`. Filters are stored per-profile in `~/.config/cup/config.json`.

### `cup filter save <name> [args...]`

Save a command as a named shortcut.

```bash
cup filter save sprint-tasks tasks --status "in progress" --list l1 -d "Current sprint tasks"
cup filter save my-overdue overdue
cup filter save standup summary --hours 24
```

| Flag                | Required | Description                |
| ------------------- | -------- | -------------------------- |
| `-d, --description` | no       | Description for the filter |
| `--json`            | no       | Force JSON output          |

Allowed commands: `tasks`, `search`, `sprint`, `assigned`, `overdue`, `inbox`, `summary`, `views`, `lists`, `spaces`, `folders`, `members`, `tags`, `goals`, `key-results`, `task-types`, `templates`, `list-templates`, `folder-templates`, `docs`, `time list`.

### `cup filter run <name>`

Execute a saved shortcut. Equivalent to running the full command directly.

```bash
cup filter run sprint-tasks
cup filter run my-overdue
```

### `cup filter list`

List all saved shortcuts for the active profile.

```bash
cup filter list
cup filter list --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup filter delete <name>`

Remove a saved shortcut.

```bash
cup filter delete sprint-tasks
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup filter show <name>`

Show details of a single saved shortcut.

```bash
cup filter show sprint-tasks
cup filter show standup --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

---

## Favorites

Local favorites for quick access to frequently used entities. Stored per-profile in `~/.config/cup/config.json` (not synced to ClickUp - there is no public favorites API).

Supported types: `sprint-folder`, `space`, `list`, `folder`, `view`, `task`.

### `cup favorite add <type> <id> [alias]`

Add a favorite. If alias is omitted, one is generated from the entity name (fetched from the API and slugified).

```bash
cup favorite add sprint-folder 12345
cup favorite add sprint-folder 12345 my-sprint
cup favorite add sprint-folder 12345 --name "Team Sprint"
cup favorite add space 67890 eng --name "Engineering"
cup favorite add list 11111 backlog
cup favorite add sprint-folder 12345 --json
```

| Flag                | Required | Description       |
| ------------------- | -------- | ----------------- |
| `-n, --name <name>` | no       | Display name      |
| `--json`            | no       | Force JSON output |

### `cup favorite remove <alias>`

Remove a favorite by its alias.

```bash
cup favorite remove my-sprint
cup favorite remove eng
cup favorite remove backlog --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup favorite list`

List all favorites for the active profile.

```bash
cup favorite list
cup favorite list --type sprint-folder
cup favorite list --json
```

| Flag            | Required | Description                         |
| --------------- | -------- | ----------------------------------- |
| `--type <type>` | no       | Filter by type (e.g. sprint-folder) |
| `--json`        | no       | Force JSON output                   |

**Sprint integration:** Favorited `sprint-folder` entries are automatically used by `cup sprint` and `cup sprints` as additional discovery sources. Priority order: `--folder` flag > `sprintFolderId` config > favorites > auto-detection.

---

## Configuration Commands

### `cup profile`

Manage named profiles for switching between ClickUp workspaces or accounts. All commands support the global `-p, --profile <name>` flag to override the default profile for a single invocation.

#### `cup profile list`

List all profiles. Marks the default profile.

```bash
cup profile list
cup profile list --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

#### `cup profile add <name>`

Add a new profile interactively. Prompts for API token, validates it, auto-detects workspaces, and saves.

```bash
cup profile add work
cup profile add personal
```

#### `cup profile remove <name>`

Remove a profile. Refuses to remove the last profile.

```bash
cup profile remove old-account
```

#### `cup profile use <name>`

Set the default profile.

```bash
cup profile use personal
```

### `cup config`

Manage CLI configuration.

```bash
cup config get apiToken
cup config set teamId 12345
cup config path
```

Valid keys: `apiToken`, `teamId`, `sprintFolderId`. Setting `apiToken` validates the `pk_` prefix. Setting `sprintFolderId` pins `cup sprint` to a specific folder, skipping auto-detection. Operates on the active profile (use `-p <name>` to target a specific profile).

### `cup completion <shell>`

Output shell completion script. Supports `bash`, `zsh`, and `fish`.

```bash
eval "$(cup completion bash)"                                    # Bash
eval "$(cup completion zsh)"                                     # Zsh
cup completion fish > ~/.config/fish/completions/cup.fish         # Fish
```
