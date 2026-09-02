# Command Reference

All commands support `--help` for full flag details. When piped (no TTY), commands output Markdown by default. Pass `--json` for JSON output.

## Output Modes

Commands behave differently based on how they're invoked:

| Context            | Behavior                                                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminal (TTY)** | Task listing commands show an interactive picker (navigate with ↑/↓ or j/k, Space to select, Enter to confirm). Selected tasks display full details and offer to open in browser. Color-coded output. |
| **Piped**          | Clean markdown output, no colors, no prompts. Suitable for agents and scripts.                                                                                                                        |
| **`--json` flag**  | Structured JSON output. No prompts. Overrides both TTY and piped modes.                                                                                                                               |

Interactive prompts also appear for: sprint disambiguation (multiple matches), workspace selection (`cup init`), agent selection (`cup skill`), and destructive confirmations (`cup delete`, `cup list-delete`, `cup folder-delete`, `cup space-delete`, `cup archive`, `cup view-delete`, `cup merge`, `cup webhook delete`).

## Multiline markdown for descriptions and comments

Agents and scripts frequently pass multiline markdown to `-d` / `-m`. Shell quoting is the main failure point (natural-language apostrophes, bullet lists, code blocks). In order of preference:

**1. File input — most robust, no shell quoting at all.** Use `--description-file` / `--message-file` / `--content-file`; `-` reads stdin:

```bash
cup create -n "Task" -l <listId> --description-file /tmp/desc.md
cup update <taskId> --description-file /tmp/desc.md
cup comment <taskId> --message-file /tmp/comment.md
cup doc-page-edit <docId> <pageId> --content-file /tmp/page.md
cup update <taskId> --description-file - < desc.md          # stdin
```

`--description-file` works on `cup create` / `cup update`; `--message-file` works on `cup comment`, `cup comment-edit`, `cup reply`, `cup list-comment`, `cup view-comment`, and chat `send` / `reply` / `message-update`; `--content-file` works on `cup doc-page-create` / `cup doc-page-edit`. Each is mutually exclusive with its inline `-d` / `-m` / `-c` flag.

**2. Quoted heredoc for inline multiline** — preserves backticks, newlines, **and** apostrophes:

```bash
cup update abc123 -d "$(cat <<'EOF'
## API Notes

Call `init()` before `run()`. Follow the team's conventions.

- Step 1
- Step 2
EOF
)"
```

**3. `$'...'` (ANSI-C) only for short strings with backticks** — and never split it with `'\''` for an apostrophe:

```bash
cup update abc123 -d $'Call `init()` first.\n\n- Step 1'

# BROKEN: after the '\'' apostrophe break the tail is normal single-quoted,
# so \n is passed literally and renders as "\n\n## Goals" text in ClickUp.
cup update abc123 -d $'team'\''s notes\n\n## Goals'   # don't do this
```

Avoid plain double quotes for content with backticks — backticks are legacy command substitution, so `"Use `init()`"` tries to execute `init`.

## Mentions

Comment commands (`cup comment`, `cup reply`, `cup comment-edit`, `cup list-comment`, `cup view-comment`) can post real ClickUp @mentions that generate a notification for the mentioned user. There are two ways to add one:

**1. The `--mention` flag** prepends a mention to the comment. It accepts a user ID, email, username, or `me`, is repeatable, and resolves the value to a real ClickUp user before posting.

```bash
cup comment abc123 -m "ticket created" --mention 158675336
cup comment abc123 -m "please review" --mention john@example.com --mention me
cup reply <commentId> -m "agreed" --mention jane@example.com
```

**2. The `<@userId>` inline token** places a mention mid-sentence, exactly where you write it in the `-m` message. The token must use a numeric user ID (find IDs with `cup members`).

```bash
cup comment abc123 -m "I need <@158675336> to check this. Thanks!"
```

Both approaches produce a real mention (a ClickUp tag block) that notifies the user — unlike `--notify-all`, which notifies every assignee/watcher without tagging anyone specific.

> **Why isn't bare `@Name` parsed?** A plain `@Name` in the message text is left as-is. Matching names to users is ambiguous (duplicate or partial names, display vs. username), so the CLI requires an explicit ID, email, or `me` via `--mention`, or a numeric `<@userId>` token, to avoid mentioning the wrong person.

## Rich links in comments

Links in comment messages render as clickable links in ClickUp:

- **Markdown links** — `[text](https://example.com)` renders `text` as a clickable link.
- **Bare URLs** — a plain `https://...` in the message is auto-linked, so you don't need markdown syntax for a simple URL.

```bash
cup comment abc123 -m "Fixed in [PR #42](https://github.com/org/repo/pull/42)"
cup comment abc123 -m "See https://example.com/pr/42 for details"
```

Unfurled preview cards (the embedded link previews shown in the ClickUp web UI) are **not** supported — they are a web-UI-only feature with no API support. Links post as clickable text links.

## Custom Task IDs

ClickUp workspaces can configure custom task IDs with a prefix per space (e.g., `PROJ-123`, `DEV-42`). The CLI detects these automatically - any ID matching the `PREFIX-DIGITS` format (uppercase letters, hyphen, digits) is treated as a custom task ID.

All commands that accept task IDs work with both native IDs and custom IDs:

```bash
cup task PROJ-123
cup update DEV-42 --status done
cup comment PROJ-456 -m "Fixed in latest commit"
cup subtasks DEV-100
cup field abc123 --set "Epic" PROJ-123          # task-relationship field values too
cup create -n "Task" -l <listId> --field "Epic" PROJ-123
```

Custom ID resolution uses the `teamId` from your config, which is required (`cup init` sets it up).

**Task URLs:** Anywhere a task ID is accepted, you can also pass a full ClickUp task URL. The ID is extracted automatically, including from URLs with a workspace segment or trailing query/fragment.

```bash
cup task https://app.clickup.com/t/9017679539/DEV-2760   # same as: cup task DEV-2760
```

**Task links with custom IDs:** The `cup link` command passes both task IDs in a single API request. When both IDs are custom, this works correctly. However, mixing custom and native IDs in a single link command may not work as expected because the ClickUp API applies the `custom_task_ids` flag to all IDs in the request.

<!-- quick-reference:start -->

## Quick Reference

| Command                                                  | Description                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `cup init`                                               | First-time setup (interactive, or use --token --team for agents)            |
| `cup skill`                                              | Install skill for your agents                                               |
| `cup filter save <name> [args...]`                       | Save a command shortcut                                                     |
| **Read**                                                 |                                                                             |
| `cup auth`                                               | Check authentication status                                                 |
| `cup tasks`                                              | My tasks (--all for all assignees)                                          |
| `cup task <taskId>`                                      | Get task details                                                            |
| `cup sprint`                                             | My tasks in the active sprint                                               |
| `cup sprints`                                            | List all sprints across folders                                             |
| `cup subtasks <taskId>`                                  | List subtasks of a task                                                     |
| `cup comments <taskId>`                                  | List comments on a task                                                     |
| `cup replies <commentId>`                                | List threaded replies on a comment                                          |
| `cup activity <taskId>`                                  | Task details + comment history                                              |
| `cup lists <spaceId>`                                    | List all lists in a space                                                   |
| `cup spaces`                                             | List spaces in workspace                                                    |
| `cup inbox`                                              | Recently updated tasks assigned to me                                       |
| `cup assigned`                                           | My tasks grouped by pipeline stage                                          |
| `cup open <query>`                                       | Open a task in the browser                                                  |
| `cup search [query]`                                     | Search tasks by name or filter by flags (--all for all assignees)           |
| `cup summary`                                            | Daily standup helper                                                        |
| `cup overdue`                                            | Tasks past their due date                                                   |
| `cup attachments <taskId>`                               | List attachments on a task                                                  |
| `cup export user <userRef>`                              | Export all tasks assigned to a user (me, id, email; incl. closed, archived) |
| `cup export team <spaceRef>`                             | Export every list in a space (id or name), incl. archived                   |
| `cup export roadmap <listId>`                            | Export a list with initiatives grouped (--item-id) and subtask trees        |
| `cup export initiatives <listId>`                        | Export only initiative-typed tasks (--item-id) plus their subtask trees     |
| `cup export docs`                                        | Export every workspace doc as markdown page trees                           |
| `cup export all`                                         | Export the whole workspace (plans, confirms; --yes for non-interactive)     |
| `cup attach-get <taskId> [selector]`                     | Download task attachment(s)                                                 |
| `cup task-members <taskId>`                              | List members with access to a task                                          |
| `cup plan`                                               | Show workspace plan                                                         |
| `cup tags <spaceId>`                                     | List tags in a space                                                        |
| `cup time-in-status <taskId>`                            | Show how long a task has been in each status                                |
| `cup docs [query]`                                       | List workspace docs                                                         |
| `cup doc <docId> [pageId]`                               | View a doc or doc page                                                      |
| `cup doc-pages <docId>`                                  | All pages in a doc with content                                             |
| `cup folders <spaceId>`                                  | List folders in a space                                                     |
| `cup members`                                            | List workspace members                                                      |
| `cup groups`                                             | List user groups (teams) in your workspace                                  |
| `cup fields <listId>`                                    | List custom fields for a list                                               |
| `cup goals`                                              | List goals in your workspace                                                |
| `cup key-results <goalId>`                               | List key results for a goal                                                 |
| `cup task-types`                                         | List custom task types                                                      |
| `cup templates`                                          | List task templates                                                         |
| `cup list-templates`                                     | List list templates                                                         |
| `cup folder-templates`                                   | List folder templates                                                       |
| `cup views <id>`                                         | List views on a list, space, folder, or workspace                           |
| `cup view <viewId>`                                      | Get view details                                                            |
| `cup view-tasks <viewId>`                                | List tasks in a view                                                        |
| `cup filter list`                                        | List saved shortcuts                                                        |
| `cup filter run <name>`                                  | Run a saved shortcut                                                        |
| `cup favorite list`                                      | List saved favorites                                                        |
| `cup list-comments <listId>`                             | List comments on a list                                                     |
| `cup view-comments <viewId>`                             | List comments on a view                                                     |
| `cup webhook list`                                       | List webhooks                                                               |
| `cup shared`                                             | Show shared spaces, folders, and lists                                      |
| `cup chat channels`                                      | List chat channels you follow                                               |
| `cup chat channel <channelId>`                           | Show channel details                                                        |
| `cup chat messages <channelId>`                          | List recent messages in a channel                                           |
| `cup chat members <channelId>`                           | List channel members                                                        |
| `cup chat followers <channelId>`                         | List channel followers                                                      |
| `cup chat replies <messageId>`                           | List replies to a message                                                   |
| `cup chat reactions <messageId>`                         | List reactions on a message                                                 |
| **Write**                                                |                                                                             |
| `cup update <taskId>`                                    | Update a task                                                               |
| `cup create`                                             | Create a new task                                                           |
| `cup comment <taskId>`                                   | Post a comment on a task                                                    |
| `cup comment-edit <commentId>`                           | Edit an existing comment                                                    |
| `cup comment-delete [commentId]`                         | Delete a comment                                                            |
| `cup reply <commentId>`                                  | Reply to a comment                                                          |
| `cup archive <taskId>`                                   | Archive or unarchive a task                                                 |
| `cup assign <taskId>`                                    | Assign or unassign users and groups                                         |
| `cup depend <taskId>`                                    | Add or remove task dependencies                                             |
| `cup link <taskId> <linksTo>`                            | Add or remove a link between tasks                                          |
| `cup attach <taskId> <filePath>`                         | Upload a file attachment to a task                                          |
| `cup move <taskId>`                                      | Add or remove a task from a list                                            |
| `cup field <taskId>`                                     | Set or remove custom field values                                           |
| `cup delete <taskId>`                                    | Delete a task                                                               |
| `cup list-delete <listId>`                               | Delete a list                                                               |
| `cup folder-delete <folderId>`                           | Delete a folder                                                             |
| `cup space-delete <spaceId>`                             | Delete a space                                                              |
| `cup tag <taskId>`                                       | Add or remove tags on a task                                                |
| `cup tag-create <spaceId> <name>`                        | Create a tag in a space                                                     |
| `cup tag-delete <spaceId> <name>`                        | Delete a tag from a space                                                   |
| `cup tag-update <spaceId> <tagName>`                     | Update a tag in a space                                                     |
| `cup checklist`                                          | Manage checklists on tasks                                                  |
| `cup time start <taskId>`                                | Start tracking time on a task                                               |
| `cup time stop`                                          | Stop the running timer                                                      |
| `cup time status`                                        | Show the currently running timer                                            |
| `cup time log <taskId> <duration>`                       | Log a manual time entry                                                     |
| `cup time list`                                          | List my recent time entries (--all for team)                                |
| `cup time update <timeEntryId>`                          | Update a time entry                                                         |
| `cup time delete <timeEntryId>`                          | Delete a time entry                                                         |
| `cup time estimate-by-user <taskId> <userId> <duration>` | Set per-user time estimate                                                  |
| `cup doc-create <title>`                                 | Create a new doc                                                            |
| `cup doc-page-create <docId> <name>`                     | Create a page in a doc                                                      |
| `cup doc-page-edit <docId> <pageId>`                     | Edit a doc page                                                             |
| `cup doc-delete <docId>`                                 | Not supported by ClickUp API (delete Docs in the UI)                        |
| `cup doc-page-delete <docId> <pageId>`                   | Delete a doc page                                                           |
| `cup space-create <name>`                                | Create a space                                                              |
| `cup list-create <spaceId> <name>`                       | Create a list in a space                                                    |
| `cup folder-create <spaceId> <name>`                     | Create a folder in a space                                                  |
| `cup list-rename <listId> <newName>`                     | Rename a list                                                               |
| `cup folder-rename <folderId> <newName>`                 | Rename a folder                                                             |
| `cup space-rename <spaceId> <newName>`                   | Rename a space                                                              |
| `cup field-create <name>`                                | Create a custom field in your workspace or on one or more lists             |
| `cup duplicate <taskId>`                                 | Duplicate a task                                                            |
| `cup bulk status <status> <taskIds...>`                  | Bulk update task status                                                     |
| `cup bulk assign <taskIds...>`                           | Bulk assign user to tasks                                                   |
| `cup bulk due-date <date> <taskIds...>`                  | Bulk set due date                                                           |
| `cup bulk tag <tagName> <taskIds...>`                    | Bulk add/remove tag                                                         |
| `cup bulk priority <taskIds...>`                         | Bulk set priority on tasks                                                  |
| `cup bulk field <taskIds...>`                            | Bulk set a custom field value on tasks                                      |
| `cup bulk move <taskIds...>`                             | Move multiple tasks to a destination list                                   |
| `cup goal-create <name>`                                 | Create a goal                                                               |
| `cup goal-update <goalId>`                               | Update a goal                                                               |
| `cup goal-delete <goalId>`                               | Delete a goal                                                               |
| `cup key-result-create <goalId> <name>`                  | Create a key result on a goal                                               |
| `cup key-result-update <keyResultId>`                    | Update a key result                                                         |
| `cup key-result-delete <keyResultId>`                    | Delete a key result                                                         |
| `cup list-from-template <name>`                          | Create a list from a template                                               |
| `cup view-create <listId> <name>`                        | Create a view on a list                                                     |
| `cup view-update <viewId>`                               | Update a view                                                               |
| `cup view-delete <viewId>`                               | Delete a view                                                               |
| `cup list-comment <listId>`                              | Post a comment on a list                                                    |
| `cup view-comment <viewId>`                              | Post a comment on a view                                                    |
| `cup webhook create`                                     | Create a webhook                                                            |
| `cup webhook update <webhookId>`                         | Update a webhook                                                            |
| `cup webhook delete <webhookId>`                         | Delete a webhook                                                            |
| `cup merge <sourceTaskId> <intoTaskId>`                  | Merge a task into another                                                   |
| `cup chat send <channelId>`                              | Send a message to a channel                                                 |
| `cup chat channel-create <name>`                         | Create a new chat channel                                                   |
| `cup chat dm <userIds...>`                               | Create or open a DM                                                         |
| `cup chat channel-update <channelId>`                    | Update a channel                                                            |
| `cup chat channel-delete <channelId>`                    | Delete a channel                                                            |
| `cup chat reply <messageId>`                             | Reply to a message                                                          |
| `cup chat react <messageId>`                             | Add a reaction to a message                                                 |
| `cup chat unreact <messageId>`                           | Remove a reaction from a message                                            |
| `cup chat message-update <messageId>`                    | Edit a message                                                              |
| `cup chat message-delete <messageId>`                    | Delete a message                                                            |
| **Configuration**                                        |                                                                             |
| `cup favorite add <type> <id> [alias]`                   | Add a favorite                                                              |
| `cup favorite remove <alias>`                            | Remove a favorite                                                           |
| `cup profile`                                            | Manage profiles                                                             |
| `cup config`                                             | Manage CLI configuration                                                    |
| `cup completion <shell>`                                 | Output shell completion script                                              |

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

### `cup search [query]`

Search tasks by name, or list tasks filtered by flags when no query is given. Defaults to your tasks; use `--all` for all assignees. Supports multi-word queries with case-insensitive matching. Status filter supports fuzzy matching.

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
cup search --assignee me            # no query — all my tasks
cup search --assignee me --status "in progress"  # filter without query
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

### `cup attachments <taskId>`

List attachments on a task. Shows file name, size, URL, and upload date for each attachment.

```bash
cup attachments abc123
cup attachments abc123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup export <subcommand>`

Export tasks and docs to a local archive for knowledge transfer or off-boarding. Each task is stored once as lossless JSON plus rendered markdown; each export scope ("slice") writes a navigable index over that shared store. Slices compose: run several into the same `--out` directory and shared tasks are fetched once. Re-runs skip what is already there.

```bash
cup export user me                              # everything ever assigned to me
cup export team "Atlas"                       # every list in a space, by id or name
cup export roadmap <listId> --item-id 1004      # initiatives grouped with subtask trees
cup export initiatives <listId> --item-id 1004  # only initiatives and their trees
cup export docs                                 # every doc as markdown page trees
cup export all --dry-run                        # plan: counts, estimated requests and time
cup export all --yes                            # whole workspace, non-interactive
```

| Subcommand             | Description                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `user <userRef>`       | Tasks assigned to `me`, an id, email, or username. Closed and archived included                 |
| `team <spaceRef>`      | Every list in a space (id or name), including archived lists and folders                        |
| `roadmap <listId>`     | One list; with `--item-id`, initiatives grouped with nested subtask checklists                  |
| `initiatives <listId>` | Only initiative-typed tasks in a list plus their subtask trees. Requires `--item-id`            |
| `docs`                 | Every workspace doc, one directory per doc, one markdown file per page                          |
| `all`                  | Every space as a team slice, then docs. Prints a plan and asks to confirm; `--yes` if not a TTY |

| Flag               | Default            | Description                                                                    |
| ------------------ | ------------------ | ------------------------------------------------------------------------------ |
| `--out <dir>`      | `./clickup-export` | Archive root; all slices compose into it                                       |
| `--refresh`        | off                | Re-fetch tasks already in the archive                                          |
| `--no-attachments` | off                | Skip attachment binaries (metadata still written)                              |
| `--dry-run`        | off                | Discover and print the plan, fetch nothing                                     |
| `--rpm <n>`        | `90`               | Request throttle per minute (ClickUp Business limit is 100)                    |
| `--item-id <n>`    |                    | `custom_item_id` that marks an initiative in your workspace (`cup task-types`) |
| `--yes`            | off                | Skip the confirmation prompt (required for `all` when not a TTY)               |
| `--json`           | no                 | Machine-readable summary                                                       |

Archive layout: `tasks/<id>/` holds `task.json`, `task.md`, `comments.json`/`.md`, `attachments.json` and `attachments/`; `slices/<kind>-<slug>/README.md` is the index for one scope; `docs/<slug>-<id>/` holds `doc.json`, a README, and one `.md` per page (children nested); `manifest.json` records what was exported and drives incremental re-runs. Task ids match ClickUp URLs, links between exported tasks are relative, and links to tasks outside the archive point at ClickUp marked `(not exported)`.

A task costs 3+ requests plus one per attachment; at 90 req/min a 5,000-task workspace takes about 3 hours. The manifest is checkpointed every 25 tasks, so an interrupted run resumes when re-run. Whiteboards, dashboards, and automations have no public API: export those from the ClickUp UI.

### `cup task-members <taskId>`

List members with access to a task. Shows user ID, username, email, and role for each member.

```bash
cup task-members abc123
cup task-members abc123 --json
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

### `cup plan`

Show your workspace plan (Free, Unlimited, Business, Enterprise, etc.) and current usage details.

```bash
cup plan
cup plan --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup shared`

Show the shared hierarchy for your workspace — shared spaces, folders, and lists that are visible to your team.

```bash
cup shared
cup shared --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

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
JSON output remains a flat array and includes `parent_folder` on subfolders so clients can
reconstruct the hierarchy. Top-level folders omit the field.

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

Update a task. Provide at least one of: `--name`, `--description`, `--status`, `--priority`, `--due-date`, `--start-date`, `--time-estimate`, `--assignee`, `--remove-assignee`, `--group-assignee`, `--remove-group-assignee`, `--parent`, `--archive`, `--unarchive`, `--type`, `--field`.

```bash
cup update abc123 -s "in progress"
cup update abc123 -n "New task name"
cup update abc123 -d "Updated description with **markdown**"
cup update abc123 -d $'## Section\n\nUse `copy()` here.\n- Item 1\n- Item 2'  # backticks + newlines
cup update abc123 --priority high
cup update abc123 --due-date 2025-03-15              # date only
cup update abc123 --due-date 2025-03-15T14:30        # date + time (user's timezone)
cup update abc123 --due-date 2025-03-15T14:30:00Z    # UTC
cup update abc123 --due-date 2025-03-15T14:30:00+08:00  # explicit offset
cup update abc123 --due-date none         # clear due date
cup update abc123 --start-date 2025-03-01
cup update abc123 --start-date 2025-03-01T09:00      # start date with time
cup update abc123 --assignee me
cup update abc123 --assignee 12345
cup update abc123 --remove-assignee me
cup update abc123 --assignee 99 --remove-assignee 12345
cup update abc123 --group-assignee @mobile-team       # assign by handle (find IDs with `cup groups`)
cup update abc123 --group-assignee mobile-team,backend  # multiple groups, comma-separated
cup update abc123 --group-assignee 00000000-0000-0000-0000-000000000001  # assign by UUID
cup update abc123 --remove-group-assignee @backend
cup update abc123 -n "New name" -s "done" --priority urgent
cup update abc123 --time-estimate 2h
cup update abc123 --parent parentTaskId   # make it a subtask
cup update abc123 --archive               # archive a task
cup update abc123 --unarchive             # unarchive a task
cup update abc123 --type Initiative       # change task type by name
cup update abc123 --type 1                # change task type by custom_item_id
cup update abc123 --field "Story Points" 5
cup update abc123 --field "Priority" "High" --field "Tags" "bug"
cup update abc123 -s "in progress" --json
```

`--field "Name" value` updates a custom field inline as part of the update. Field names are resolved via the task's list using the same parser as `cup field --set` (text, number, checkbox, dropdown name, labels, date, url, email, etc.). Repeat the flag to set multiple fields.

| Flag                           | Description                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `-n, --name <text>`            | New task name                                                                                         |
| `-d, --description <text>`     | New description (markdown supported). See "Multiline markdown" above for quoting                      |
| `--description-file <path>`    | Read description from a file (`-` for stdin); avoids shell quoting. Mutually exclusive with `-d`      |
| `-s, --status <status>`        | New status, supports fuzzy matching (e.g. `"prog"` matches `"in progress"`)                           |
| `--priority <level>`           | Priority: `urgent`, `high`, `normal`, `low` (or 1-4)                                                  |
| `--due-date <date>`            | Due date (`YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, or ISO 8601 with offset), or `"none"`/`"clear"` to remove |
| `--start-date <date>`          | Start date (`YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, or ISO 8601 with offset)                                |
| `--time-estimate <duration>`   | Time estimate (e.g. `"2h"`, `"30m"`, `"1h30m"`)                                                       |
| `--assignee <userId>`          | Add assignee by user ID or `"me"`                                                                     |
| `--remove-assignee <userId>`   | Remove assignee by user ID or `"me"`                                                                  |
| `--group-assignee <id>`        | Add group assignee by UUID or `@handle` (repeatable or comma-separated; find IDs with `cup groups`)   |
| `--remove-group-assignee <id>` | Remove group assignee by UUID or `@handle` (repeatable or comma-separated)                            |
| `--parent <taskId>`            | Set parent task (makes this a subtask)                                                                |
| `--archive`                    | Archive the task                                                                                      |
| `--unarchive`                  | Unarchive the task                                                                                    |
| `--type <type>`                | Change task type (name or custom_item_id)                                                             |
| `--field <name> <value>`       | Set custom field inline (repeatable; resolves field names via the task's list)                        |
| `--json`                       | Force JSON output even in terminal                                                                    |

### `cup create`

Create a new task. If `--parent` is given, list is auto-detected from the parent task.

```bash
cup create -n "Fix login bug" -l <listId>
cup create -n "Subtask name" --parent <parentTaskId>    # --list auto-detected
cup create -n "Task" -l <listId> -d "desc" -s "open"
cup create -n "Task" -l <listId> -d $'## Overview\n\nCall `init()` first.\n- Step 1\n- Step 2'
cup create -n "Task" -l <listId> --priority high --due-date 2025-06-01
cup create -n "Task" -l <listId> --due-date 2025-06-01T10:00        # date + time
cup create -n "Task" -l <listId> --due-date 2025-06-01T10:00:00Z    # UTC
cup create -n "Task" -l <listId> --assignee me --tags "bug,frontend"
cup create -n "Task" -l <listId> --group-assignee @mobile-team             # assign group by handle
cup create -n "Task" -l <listId> --group-assignee mobile-team,backend     # multiple groups
cup create -n "Initiative" -l <listId> --custom-item-id 1
cup create -n "Task" -l <listId> --time-estimate 2h
cup create -n "Bug fix" -l <listId> --field "Story Points" 5 --field "Stage" "In Review"
cup create -n "From Template" -l <listId> --template <templateId>
cup create -n "Bug fix" -l sprint:current         # create in active sprint
cup create -n "Fix bug" -l <listId> --json
```

`sprint:current` is a pseudo-ID that auto-resolves to the active sprint list using the same detection chain as `cup sprint` (`--folder` flag > `sprintFolderId` config > favorited sprint-folders > auto-detection).

`--field "Name" value` sets custom fields inline as part of task creation. Field names are resolved once against the target list via `GET /list/{id}/field`, so the values land in the initial create payload instead of requiring a follow-up `cup field --set` call. Repeat the flag to set multiple fields. Value parsing matches `cup field --set` (text, number, checkbox, dropdown name, labels, date, url, email, etc.).

| Flag                         | Required         | Description                                                                          |
| ---------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `-n, --name <name>`          | yes              | Task name                                                                            |
| `-l, --list <listId>`        | if no `--parent` | Target list ID (accepts `sprint:current` pseudo-ID)                                  |
| `--parent <taskId>`          | no               | Parent task (list auto-detected). No `-p` short form: `-p` is the global `--profile` |
| `-d, --description <text>`   | no               | Description (markdown). See "Multiline markdown" above for quoting                   |
| `--description-file <path>`  | no               | Read description from a file (`-` for stdin). Mutually exclusive with `-d`           |
| `-s, --status <status>`      | no               | Initial status                                                                       |
| `--priority <level>`         | no               | Priority: `urgent`, `high`, `normal`, `low` (or 1-4)                                 |
| `--due-date <date>`          | no               | Due date (`YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, or ISO 8601 with offset)                 |
| `--start-date <date>`        | no               | Start date (`YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, or ISO 8601 with offset)               |
| `--time-estimate <duration>` | no               | Time estimate (e.g. `"2h"`, `"30m"`, `"1h30m"`)                                      |
| `--assignee <userId>`        | no               | Assignee by user ID or `"me"`                                                        |
| `--group-assignee <ids>`     | no               | Group assignees by UUID or `@handle` (comma-separated; find IDs with `cup groups`)   |
| `--tags <tags>`              | no               | Comma-separated tag names                                                            |
| `--custom-item-id <id>`      | no               | Custom task type ID (e.g. for creating initiatives)                                  |
| `--template <id>`            | no               | Create from a task template (use `cup templates` to find IDs)                        |
| `--field <name> <value>`     | no               | Set custom field inline (repeatable)                                                 |
| `--json`                     | no               | Force JSON output even in terminal                                                   |

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

### `cup list-delete <listId>`

Delete a list. **DESTRUCTIVE - cannot be undone.**

```bash
cup list-delete 12345
cup list-delete 12345 --confirm
cup list-delete 12345 --confirm --json
```

In TTY mode without `--confirm`: shows the list name and prompts for confirmation (default: No). In non-interactive/piped mode, `--confirm` is required.

| Flag        | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| `--confirm` | Skip confirmation prompt (required in non-interactive mode) |
| `--json`    | Force JSON output                                           |

### `cup folder-delete <folderId>`

Delete a folder. **DESTRUCTIVE - cannot be undone.**

```bash
cup folder-delete 12345
cup folder-delete 12345 --confirm
cup folder-delete 12345 --confirm --json
```

In TTY mode without `--confirm`: shows the folder name and prompts for confirmation (default: No). In non-interactive/piped mode, `--confirm` is required.

| Flag        | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| `--confirm` | Skip confirmation prompt (required in non-interactive mode) |
| `--json`    | Force JSON output                                           |

### `cup space-delete <spaceId>`

Delete a space. **DESTRUCTIVE - cannot be undone.**

```bash
cup space-delete 12345
cup space-delete 12345 --confirm
cup space-delete 12345 --confirm --json
```

In TTY mode without `--confirm`: shows the space name and prompts for confirmation (default: No). In non-interactive/piped mode, `--confirm` is required.

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

For long or free-text values (standup notes, summaries), read the value from a file with
`--value-file` instead of quoting it inline — see "Multiline markdown" above. Pass `-` to read stdin:

```bash
cup field abc123 --set "Standup 4 - 6/25" --value-file /tmp/note.md
cup field abc123 --set "Standup 4 - 6/25" --value-file -   # stdin
```

| Flag                       | Description                                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--set "Field Name" <val>` | Set a custom field by name. Supports: text, number, checkbox (true/false), dropdown (option name), labels (comma-separated names), date (YYYY-MM-DD), url, email, emoji/rating (0-5), manual_progress (0-100), tasks/relationship (comma-separated task IDs), users/people (comma-separated user IDs) |
| `--value-file <path>`      | Read the field value from a file (`-` for stdin). Use with `--set "Field Name"`; mutually exclusive with an inline value                                                                                                                                                                              |
| `--remove "Field Name"`    | Remove a custom field value                                                                                                                                                                                                                                                                           |
| `--json`                   | Force JSON output                                                                                                                                                                                                                                                                                     |

Both `--set` and `--remove` can be used together in one invocation.

### `cup field-create <name>`

Create a custom field — workspace-wide, on a single list, or on multiple lists at once. Requires specifying the field type.

```bash
cup field-create "Story Points" -t number                       # workspace-wide
cup field-create "Priority Level" -t drop_down --options "Low,Med,High"
cup field-create "Approved" -t checkbox --required
cup field-create "Sprint Goal" -t text --list 901614127479      # one list
cup field-create "Story Points" -t number --lists 901,902,903   # bulk across lists
cup field-create "Contact Email" -t email --json
```

For `--lists`, the same field is created on every listed list in parallel; per-list success/failure is reported and one failure does not stop the rest.

| Flag                | Required             | Description                                                                                          |
| ------------------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| `-t, --type <type>` | yes                  | Field type: text, short_text, number, date, checkbox, drop_down, labels, email, phone, url, currency |
| `-d, --description` | no                   | Field description                                                                                    |
| `--options <items>` | for drop_down/labels | Comma-separated options                                                                              |
| `--required`        | no                   | Make the field required                                                                              |
| `--list <listId>`   | no                   | Create the field scoped to a single list (mutually exclusive with `--lists`)                         |
| `--lists <ids>`     | no                   | Comma-separated list IDs — create the field on each (mutually exclusive with `--list`)               |
| `--json`            | no                   | Force JSON output                                                                                    |

Default (no `--list`/`--lists`) creates a workspace-level field available across all lists.

### `cup comment <id>`

Post a comment on a task. Markdown formatting in the message is automatically converted to ClickUp rich text (bold, italic, headers, lists, code blocks, links, etc.). See [Mentions](#mentions) and [Rich links](#rich-links-in-comments) for `--mention`, inline `<@userId>` tokens, and auto-linking.

```bash
cup comment abc123 -m "Addressed in PR #42"
cup comment abc123 -m "## Results\n\n**Passed**: 15/15\n- Unit tests\n- Integration"
cup comment abc123 -m "Done" --notify-all
cup comment abc123 -m "ticket created" --mention 158675336
cup comment abc123 -m "please review" --mention john@example.com --mention me
cup comment abc123 -m "I need <@158675336> to check this. Thanks!"
cup comment abc123 -m "See https://example.com/pr/42 for details"
cup comment abc123 -m "Done" --json
```

| Flag               | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `-m, --message`    | yes      | Comment text (markdown auto-converted; bare URLs auto-link)                 |
| `--notify-all`     | no       | Notify all task assignees                                                   |
| `--mention <user>` | no       | Mention a user by ID, email, username, or `me` (notifies them). Repeatable. |
| `--json`           | no       | Force JSON output                                                           |

### `cup comment-edit <commentId>`

Edit an existing comment on a task. Provide `--message`, `--resolved`, or `--unresolved` (or any combination). Markdown in the message is automatically converted to rich text. Supports `--mention` and inline `<@userId>` tokens (see [Mentions](#mentions)).

```bash
cup comment-edit <commentId> -m "Updated text"
cup comment-edit <commentId> -m "Fixed" --resolved
cup comment-edit <commentId> --resolved
cup comment-edit <commentId> -m "Reopening" --unresolved
cup comment-edit <commentId> -m "cc on the fix" --mention jane@example.com
cup comment-edit <commentId> -m "Updated" --json
```

| Flag               | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `-m, --message`    | no       | New comment text (markdown auto-converted; bare URLs auto-link)             |
| `--resolved`       | no       | Mark comment as resolved                                                    |
| `--unresolved`     | no       | Mark comment as unresolved                                                  |
| `--mention <user>` | no       | Mention a user by ID, email, username, or `me` (notifies them). Repeatable. |
| `--json`           | no       | Force JSON output                                                           |

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

Reply to a comment. Markdown in the message is automatically converted to rich text. Supports `--mention` and inline `<@userId>` tokens (see [Mentions](#mentions)).

```bash
cup reply 12345 -m "Agreed, will fix"
cup reply 12345 -m "agreed" --mention jane@example.com
cup reply 12345 -m "Done" --json
```

| Flag               | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `-m, --message`    | yes      | Reply text (markdown auto-converted; bare URLs auto-link)                   |
| `--notify-all`     | no       | Notify all task assignees                                                   |
| `--mention <user>` | no       | Mention a user by ID, email, username, or `me` (notifies them). Repeatable. |
| `--json`           | no       | Force JSON output                                                           |

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

Assign or unassign users and groups from a task. Supports `me` as shorthand for your user ID. All four flags accept comma-separated lists to add or remove multiple assignees in a single call. Group values accept either a UUID or a handle (with or without the leading `@`); find handles and IDs with `cup groups`.

```bash
cup assign abc123 --to 12345
cup assign abc123 --to me
cup assign abc123 --remove 12345
cup assign abc123 --to me --remove 67890
cup assign abc123 --to user1,user2,user3
cup assign abc123 --remove user1,user2
cup assign abc123 --to "me,12345" --json
cup assign abc123 --group @mobile-team                 # assign a group by handle
cup assign abc123 --group mobile-team,backend          # assign multiple groups
cup assign abc123 --group 00000000-0000-0000-0000-000000000001  # assign by UUID
cup assign abc123 --remove-group @backend              # unassign a group
cup assign abc123 --to me --group @mobile-team         # users and groups together
```

| Flag                        | Description                                                   |
| --------------------------- | ------------------------------------------------------------- |
| `--to <userIds>`            | Add assignee(s) (comma-separated, or `me`)                    |
| `--remove <userIds>`        | Remove assignee(s) (comma-separated, or `me`)                 |
| `--group <groupIds>`        | Add group assignee(s) (UUID or `@handle`, comma-separated)    |
| `--remove-group <groupIds>` | Remove group assignee(s) (UUID or `@handle`, comma-separated) |
| `--json`                    | Force JSON output                                             |

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

Add or remove a task from a list. Tasks can belong to multiple lists in ClickUp — every task has one **home list** plus zero or more additional list memberships.

**Important behavior:**

- `--to <listId>` **alone** — adds the task as a member of the additional list (the home list is unchanged). Uses v2 `addTaskToList`.
- `--to <newListId> --remove <oldListId>` — **changes the task's home list** from `oldListId` to `newListId`. Uses the v3 `home_list` endpoint with automatic status mapping for any statuses that don't exist in the destination.
- `--remove <listId>` **alone** — removes the task from an additional list (cannot remove a home list this way).

```bash
cup move abc123 --to <listId>                    # add task to additional list (multi-list membership)
cup move abc123 --remove <listId>                # remove task from an additional list
cup move abc123 --to <newListId> --remove <oldListId>  # CHANGE HOME LIST (v3 home_list, status mapped)
cup move abc123 --to sprint:current              # add to active sprint as additional list
cup move abc123 --to sprint:current --remove <oldListId>  # change home list to active sprint
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

### `cup time estimate-by-user <taskId> <userId> <duration>`

Set a per-user time estimate on a task. Duration accepts human-readable format: "2h", "30m", "1h30m", or raw milliseconds. By default adds to existing estimates; use `--replace` to overwrite all per-user estimates with just this one.

```bash
cup time estimate-by-user abc123 12345 4h
cup time estimate-by-user abc123 me 2h30m
cup time estimate-by-user abc123 12345 8h --replace
cup time estimate-by-user abc123 12345 4h --json
```

| Flag        | Required | Description                                               |
| ----------- | -------- | --------------------------------------------------------- |
| `--replace` | no       | Replace all per-user estimates instead of adding/updating |
| `--json`    | no       | Force JSON output                                         |

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

Create a new doc in your workspace. The doc is created with a root page named after the title; `-c/--content` writes that page's initial markdown content.

```bash
cup doc-create "Architecture Notes"
cup doc-create "Draft" -c "# Initial content"
cup doc-create "Plan" --json
```

| Flag            | Required | Description                |
| --------------- | -------- | -------------------------- |
| `-c, --content` | no       | Initial content (markdown) |
| `--json`        | no       | Force JSON output          |

ClickUp's Create Doc endpoint accepts only a name, so the title and content are applied to the doc's root page in a follow-up call. If the doc is created but its root page cannot be written, the error includes the new doc ID so the partial doc can be found.

### `cup doc-page-create <docId> <name>`

Create a page in a doc. Optionally nest under a parent page.

```bash
cup doc-page-create abc123 "Getting Started"
cup doc-page-create abc123 "Setup" -c "# Setup guide"
cup doc-page-create abc123 "Release Notes" --content-file notes.md
cup doc-page-create abc123 "Sub Section" --parent-page page456
cup doc-page-create abc123 "Page" --json
```

| Flag                     | Required | Description                                                                 |
| ------------------------ | -------- | --------------------------------------------------------------------------- |
| `-c, --content`          | no       | Page content (markdown)                                                     |
| `--content-file <path>`  | no       | Read page content from a file (`-` for stdin). Mutually exclusive with `-c` |
| `--parent-page <pageId>` | no       | Parent page ID for nesting                                                  |
| `--json`                 | no       | Force JSON output                                                           |

### `cup doc-page-edit <docId> <pageId>`

Edit a doc page name or content. Provide at least `--name`, `--content`, or `--content-file`.

```bash
cup doc-page-edit abc123 page456 --name "Renamed Section"
cup doc-page-edit abc123 page456 -c "# Updated content"
cup doc-page-edit abc123 page456 --content-file notes.md
cup doc-page-edit abc123 page456 --name "New Name" -c "# New body"
cup doc-page-edit abc123 page456 --name "Renamed" --json
```

| Flag                    | Required     | Description                                                                     |
| ----------------------- | ------------ | ------------------------------------------------------------------------------- |
| `--name <text>`         | at least one | New page name                                                                   |
| `-c, --content`         | at least one | New page content (markdown)                                                     |
| `--content-file <path>` | at least one | Read new page content from a file (`-` for stdin). Mutually exclusive with `-c` |
| `--json`                | no           | Force JSON output                                                               |

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

### `cup groups`

List user groups (teams) in your workspace. Shows handle, name, UUID, and member count. Use this to find handles and IDs for `--group-assignee` flags on `cup assign`, `cup update`, and `cup create`.

```bash
cup groups
cup groups --json
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

### `cup merge <sourceTaskId> <intoTaskId>`

Merge a task into another task. The source task's comments, attachments, subtasks, and checklists are moved into the target task, and the source task is deleted. **DESTRUCTIVE — the source task is permanently deleted.**

```bash
cup merge abc123 def456
cup merge abc123 def456 --confirm
cup merge abc123 def456 --confirm --json
```

In TTY mode without `--confirm`: shows both task names and prompts for confirmation (default: No). In non-interactive/piped mode, `--confirm` is required.

| Flag        | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| `--confirm` | Skip confirmation prompt (required in non-interactive mode) |
| `--json`    | Force JSON output                                           |

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

Bulk set or clear the due date on multiple tasks. Accepts `YYYY-MM-DD` (date only), `YYYY-MM-DDTHH:MM` (with time), or full ISO 8601 with offset. Use `none` or `clear` to remove due dates. Failed updates are reported but don't stop the operation.

```bash
cup bulk due-date 2025-12-31 t1 t2 t3
cup bulk due-date 2025-12-31T17:00 t1 t2 t3          # with time
cup bulk due-date 2025-12-31T17:00:00+05:30 t1 t2    # explicit offset
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

### `cup list-comments <listId>`

List comments on a list. Shows author, date, and text for each comment.

```bash
cup list-comments 12345
cup list-comments 12345 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup list-comment <listId>`

Post a comment on a list. Markdown formatting in the message is automatically converted to ClickUp rich text. Supports `--mention` and inline `<@userId>` tokens (see [Mentions](#mentions)).

```bash
cup list-comment 12345 -m "Sprint retrospective notes"
cup list-comment 12345 -m "please review" --mention john@example.com
cup list-comment 12345 -m "Done" --notify-all
cup list-comment 12345 -m "Update" --json
```

| Flag               | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `-m, --message`    | yes      | Comment text (markdown auto-converted; bare URLs auto-link)                 |
| `--notify-all`     | no       | Notify all list watchers                                                    |
| `--mention <user>` | no       | Mention a user by ID, email, username, or `me` (notifies them). Repeatable. |
| `--json`           | no       | Force JSON output                                                           |

### `cup view-comments <viewId>`

List comments on a view. Shows author, date, and text for each comment.

```bash
cup view-comments v12345
cup view-comments v12345 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup view-comment <viewId>`

Post a comment on a view. Markdown formatting in the message is automatically converted to ClickUp rich text. Supports `--mention` and inline `<@userId>` tokens (see [Mentions](#mentions)).

```bash
cup view-comment v12345 -m "View layout looks good"
cup view-comment v12345 -m "please review" --mention jane@example.com
cup view-comment v12345 -m "Approved" --notify-all
cup view-comment v12345 -m "Note" --json
```

| Flag               | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `-m, --message`    | yes      | Comment text (markdown auto-converted; bare URLs auto-link)                 |
| `--notify-all`     | no       | Notify all view watchers                                                    |
| `--mention <user>` | no       | Mention a user by ID, email, username, or `me` (notifies them). Repeatable. |
| `--json`           | no       | Force JSON output                                                           |

### `cup doc-delete <docId>`

**Not supported.** ClickUp's public API exposes no delete-Doc endpoint — the request returns HTTP 405 — so this command fails immediately with an explanation instead of sending a call that cannot succeed.

```bash
cup doc-delete abc123
# Cannot delete doc abc123: ClickUp's public API does not support deleting Docs...
```

Delete or archive the doc in the ClickUp UI instead. To remove a single page, use [`cup doc-page-delete`](#cup-doc-page-delete-docid-pageid).

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

### `cup view-tasks <viewId>`

List the tasks in a view. Renders the same task table as `cup tasks` in a terminal, Markdown when piped, and JSON with `--json`. Use `--me` to show only tasks assigned to you.

```bash
cup view-tasks <viewId>
cup view-tasks <viewId> --me
cup view-tasks <viewId> --json
```

| Flag     | Required | Description                             |
| -------- | -------- | --------------------------------------- |
| `--me`   | no       | Only tasks assigned to the current user |
| `--json` | no       | Force JSON output                       |

All view commands (`cup view`, `cup view-tasks`, `cup view-comments`, `cup view-comment`, `cup view-update`, `cup view-delete`) accept a pasted view URL (e.g. `https://app.clickup.com/<workspace>/v/gr/<viewId>`) in place of a bare view ID.

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

## Webhook Commands

`cup webhook` is a subcommand group for managing ClickUp webhooks. Create, list, update, and delete webhooks that notify external URLs when events occur in your workspace.

### `cup webhook list`

List all webhooks in your workspace.

```bash
cup webhook list
cup webhook list --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### `cup webhook create`

Create a webhook. Specify the URL to receive events and the event types to listen for. Optionally scope the webhook to a specific space, folder, list, or task.

```bash
cup webhook create --url https://example.com/hook --events "taskCreated,taskUpdated"
cup webhook create --url https://example.com/hook --events "taskStatusUpdated" --space 12345
cup webhook create --url https://example.com/hook --events "taskCreated" --folder 67890
cup webhook create --url https://example.com/hook --events "taskDeleted" --list 11111
cup webhook create --url https://example.com/hook --events "taskCreated" --task abc123
cup webhook create --url https://example.com/hook --events "taskCreated" --json
```

| Flag              | Required | Description                                                  |
| ----------------- | -------- | ------------------------------------------------------------ |
| `--url <url>`     | yes      | Endpoint URL to receive webhook events                       |
| `--events <list>` | yes      | Comma-separated event types (e.g. "taskCreated,taskUpdated") |
| `--space <id>`    | no       | Scope webhook to a space                                     |
| `--folder <id>`   | no       | Scope webhook to a folder                                    |
| `--list <id>`     | no       | Scope webhook to a list                                      |
| `--task <id>`     | no       | Scope webhook to a task                                      |
| `--json`          | no       | Force JSON output                                            |

### `cup webhook update <webhookId>`

Update a webhook's URL, events, or active status.

```bash
cup webhook update wh123 --url https://new-endpoint.com/hook
cup webhook update wh123 --events "taskCreated,taskDeleted"
cup webhook update wh123 --status active
cup webhook update wh123 --status inactive
cup webhook update wh123 --url https://example.com/hook --events "taskUpdated" --json
```

| Flag              | Required | Description                        |
| ----------------- | -------- | ---------------------------------- |
| `--url <url>`     | no       | New endpoint URL                   |
| `--events <list>` | no       | New comma-separated event types    |
| `--status <s>`    | no       | Set status: `active` or `inactive` |
| `--json`          | no       | Force JSON output                  |

### `cup webhook delete <webhookId>`

Delete a webhook. **DESTRUCTIVE — cannot be undone.**

```bash
cup webhook delete wh123
cup webhook delete wh123 --confirm
cup webhook delete wh123 --confirm --json
```

In TTY mode without `--confirm`: shows the webhook URL and prompts for confirmation (default: No). In non-interactive/piped mode, `--confirm` is required.

| Flag        | Required | Description                                                 |
| ----------- | -------- | ----------------------------------------------------------- |
| `--confirm` | no       | Skip confirmation prompt (required in non-interactive mode) |
| `--json`    | no       | Force JSON output                                           |

---

## Chat Commands

`cup chat` is a subcommand group for ClickUp's Chat v3 API. Manage channels, send and read messages, threaded replies, and reactions — all from the terminal. Chat messages use raw markdown (no rich text conversion needed).

### Channel Commands

#### `cup chat channels`

List chat channels you follow. Use `--all` to list all channels in the workspace.

```bash
cup chat channels
cup chat channels --all
cup chat channels --type dm
cup chat channels --json
```

| Flag            | Required | Description                            |
| --------------- | -------- | -------------------------------------- |
| `--all`         | no       | List all channels, not just followed   |
| `--type <type>` | no       | Filter by type (channel, dm, group_dm) |
| `--json`        | no       | Force JSON output                      |

#### `cup chat channel <channelId>`

Show channel details (name, type, topic, visibility, creation date).

```bash
cup chat channel ch_abc123
cup chat channel ch_abc123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

#### `cup chat channel-create <name>`

Create a new chat channel. Use `--space`, `--folder`, or `--list` to create a location-based channel.

```bash
cup chat channel-create "Engineering"
cup chat channel-create "Private Team" --private --topic "Internal discussion"
cup chat channel-create "Sprint Chat" --space <spaceId>
cup chat channel-create "List Chat" --list <listId> --json
```

| Flag                  | Required | Description                 |
| --------------------- | -------- | --------------------------- |
| `--private`           | no       | Create as private channel   |
| `--topic <topic>`     | no       | Channel topic               |
| `--space <spaceId>`   | no       | Create on a specific space  |
| `--folder <folderId>` | no       | Create on a specific folder |
| `--list <listId>`     | no       | Create on a specific list   |
| `--json`              | no       | Force JSON output           |

#### `cup chat dm <userIds...>`

Create or open a direct message with one or more users. Returns the existing DM channel if one already exists (idempotent).

```bash
cup chat dm 12345
cup chat dm 12345 67890
cup chat dm 12345 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

#### `cup chat channel-update <channelId>`

Update a channel's name, topic, description, or visibility.

```bash
cup chat channel-update ch_abc123 --name "New Name"
cup chat channel-update ch_abc123 --topic "Updated topic" --visibility PRIVATE
cup chat channel-update ch_abc123 --description "Team channel" --json
```

| Flag                   | Required | Description       |
| ---------------------- | -------- | ----------------- |
| `--name <name>`        | no       | New name          |
| `--topic <topic>`      | no       | New topic         |
| `--description <desc>` | no       | New description   |
| `--visibility <v>`     | no       | PUBLIC or PRIVATE |
| `--json`               | no       | Force JSON output |

#### `cup chat channel-delete <channelId>`

Delete a channel. **DESTRUCTIVE — cannot be undone.**

```bash
cup chat channel-delete ch_abc123
cup chat channel-delete ch_abc123 --confirm
cup chat channel-delete ch_abc123 --confirm --json
```

In TTY mode without `--confirm`: shows the channel name and prompts for confirmation (default: No). In non-interactive/piped mode, `--confirm` is required.

| Flag        | Required | Description                                                 |
| ----------- | -------- | ----------------------------------------------------------- |
| `--confirm` | no       | Skip confirmation prompt (required in non-interactive mode) |
| `--json`    | no       | Force JSON output                                           |

#### `cup chat members <channelId>`

List members of a channel.

```bash
cup chat members ch_abc123
cup chat members ch_abc123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

#### `cup chat followers <channelId>`

List followers of a channel.

```bash
cup chat followers ch_abc123
cup chat followers ch_abc123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

### Message Commands

#### `cup chat send <channelId>`

Send a message to a channel. Messages support markdown. Use `--post` with `--title` for long-form posts.

```bash
cup chat send ch_abc123 -m "Hello team!"
cup chat send ch_abc123 -m "## Update\n\nDeployment complete."
cup chat send ch_abc123 -m "Release notes" --post --title "v2.0 Released"
cup chat send ch_abc123 -m "Done" --json
```

| Flag              | Required | Description                       |
| ----------------- | -------- | --------------------------------- |
| `-m, --message`   | yes      | Message content (markdown)        |
| `--post`          | no       | Send as a post instead of message |
| `--title <title>` | no       | Post title (requires `--post`)    |
| `--json`          | no       | Force JSON output                 |

#### `cup chat messages <channelId>`

List recent messages in a channel.

```bash
cup chat messages ch_abc123
cup chat messages ch_abc123 --limit 10
cup chat messages ch_abc123 --json
```

| Flag          | Required | Description                        |
| ------------- | -------- | ---------------------------------- |
| `--limit <n>` | no       | Max messages to show (default: 25) |
| `--json`      | no       | Force JSON output                  |

#### `cup chat message-update <messageId>`

Edit an existing message.

```bash
cup chat message-update msg123 -m "Corrected text"
cup chat message-update msg123 -m "Fixed" --json
```

| Flag            | Required | Description       |
| --------------- | -------- | ----------------- |
| `-m, --message` | yes      | New message text  |
| `--json`        | no       | Force JSON output |

#### `cup chat message-delete <messageId>`

Delete a message. **DESTRUCTIVE — cannot be undone.**

```bash
cup chat message-delete msg123
cup chat message-delete msg123 --confirm
cup chat message-delete msg123 --confirm --json
```

In TTY mode without `--confirm`: prompts for confirmation (default: No). In non-interactive/piped mode, `--confirm` is required.

| Flag        | Required | Description                                                 |
| ----------- | -------- | ----------------------------------------------------------- |
| `--confirm` | no       | Skip confirmation prompt (required in non-interactive mode) |
| `--json`    | no       | Force JSON output                                           |

### Reply Commands

#### `cup chat reply <messageId>`

Reply to a message. Markdown supported.

```bash
cup chat reply msg123 -m "Agreed, let's proceed"
cup chat reply msg123 -m "Done" --json
```

| Flag            | Required | Description       |
| --------------- | -------- | ----------------- |
| `-m, --message` | yes      | Reply text        |
| `--json`        | no       | Force JSON output |

#### `cup chat replies <messageId>`

List replies to a message.

```bash
cup chat replies msg123
cup chat replies msg123 --limit 10
cup chat replies msg123 --json
```

| Flag          | Required | Description               |
| ------------- | -------- | ------------------------- |
| `--limit <n>` | no       | Max replies (default: 50) |
| `--json`      | no       | Force JSON output         |

### Reaction Commands

#### `cup chat react <messageId>`

Add a reaction to a message.

```bash
cup chat react msg123 --emoji thumbsup
cup chat react msg123 --emoji heart --json
```

| Flag             | Required | Description                           |
| ---------------- | -------- | ------------------------------------- |
| `--emoji <name>` | yes      | Emoji name (e.g. "thumbsup", "heart") |
| `--json`         | no       | Force JSON output                     |

#### `cup chat unreact <messageId>`

Remove a reaction from a message.

```bash
cup chat unreact msg123 --emoji thumbsup
cup chat unreact msg123 --emoji heart --json
```

| Flag             | Required | Description          |
| ---------------- | -------- | -------------------- |
| `--emoji <name>` | yes      | Emoji name to remove |
| `--json`         | no       | Force JSON output    |

#### `cup chat reactions <messageId>`

List reactions on a message.

```bash
cup chat reactions msg123
cup chat reactions msg123 --json
```

| Flag     | Required | Description       |
| -------- | -------- | ----------------- |
| `--json` | no       | Force JSON output |

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
