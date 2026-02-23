# cu - ClickUp CLI

A minimal ClickUp CLI designed for use by AI agents (Claude Code, etc.) and humans alike. All output is JSON on stdout. Errors go to stderr with exit code 1.

## Install

```bash
git clone <repo>
cd clickup-cli
npm install
npm run build
npm link
```

Verify:

```bash
which cu
cu --help
```

## Config

Create `~/.config/cu/config.json`:

```json
{
  "apiToken": "pk_...",
  "teamId": "1234567",
  "lists": ["list_id_1", "list_id_2"]
}
```

**Finding your teamId** - call the ClickUp API with your personal token:

```bash
curl -s -H "Authorization: pk_..." https://api.clickup.com/api/v2/team | jq '.teams[] | {id, name}'
```

**Finding list IDs** - list spaces, then folders, then lists:

```bash
curl -s -H "Authorization: pk_..." "https://api.clickup.com/api/v2/team/<teamId>/space?archived=false" | jq '.spaces[] | {id, name}'
```

## Commands

### `cu tasks`

List all tasks assigned to you across the configured lists.

```bash
cu tasks
```

Output:

```json
[
  {
    "id": "abc123",
    "name": "Fix login bug",
    "status": "in progress",
    "task_type": "task",
    "list": "Sprint 12",
    "url": "https://app.clickup.com/t/abc123"
  }
]
```

Fields: `id`, `name`, `status`, `task_type`, `list`, `url`, `parent` (optional, present when task has a parent).

### `cu initiatives`

List tasks of type `Initiative` assigned to you across the configured lists.

```bash
cu initiatives
```

Output format is identical to `cu tasks`.

### `cu update <taskId> -d <text>`

Update the description of a task. Markdown is supported.

```bash
cu update abc123 -d "## Summary\n\nFixed the regression introduced in PR #42."
```

Flags:

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --description <text>` | yes | New description (markdown supported) |

Output:

```json
{
  "id": "abc123",
  "name": "Fix login bug"
}
```

### `cu create -l <listId> -n <name> [options]`

Create a new task in the specified list.

```bash
cu create -l list_id_1 -n "Implement dark mode" -d "Support system preference" -s "open"
```

Flags:

| Flag | Required | Description |
|------|----------|-------------|
| `-l, --list <listId>` | yes | Target list ID |
| `-n, --name <name>` | yes | Task name |
| `-d, --description <text>` | no | Task description (markdown supported) |
| `-p, --parent <taskId>` | no | Parent initiative task ID |
| `-s, --status <status>` | no | Initial status (e.g. `open`, `in progress`) |

Output:

```json
{
  "id": "xyz789",
  "name": "Implement dark mode",
  "url": "https://app.clickup.com/t/xyz789"
}
```

## Notes for AI Agents

- All commands print JSON to stdout - pipe directly into `jq` or parse programmatically
- All errors print a plain-text message to stderr and exit with code 1
- The `lists` array in config scopes all read/list operations - only tasks in those lists are returned
- Use `cu tasks` to get current task IDs before calling `cu update` or referencing a parent with `-p`
- Task IDs are stable alphanumeric strings (e.g. `abc123`) - use them as-is across commands
