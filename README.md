# cu - ClickUp CLI

A minimal ClickUp CLI for AI agents and humans. JSON on stdout, errors on stderr, exit code 1 on failure.

## Requirements

- Node 20+
- A ClickUp account with a personal API token (`pk_...`)

## Install

```bash
npm install -g clickup-cli
```

Or from source:

```bash
git clone https://github.com/krodak/clickup-cli
cd clickup-cli
npm install && npm run build && npm link
```

## Getting started

Run the guided setup:

```bash
cu init
```

This will:
1. Ask for your ClickUp API token (`pk_...` from https://app.clickup.com/settings/apps)
2. Verify the token against the API
3. Show all lists in your workspace for selection
4. Write `~/.config/cu/config.json`

To update which lists are tracked at any time:

```bash
cu lists
```

### Manual configuration

If you prefer to configure manually, create `~/.config/cu/config.json`:

```json
{
  "apiToken": "pk_...",
  "lists": ["list_id_1", "list_id_2"]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `apiToken` | yes | Your ClickUp personal API token (`pk_...`) |
| `lists` | yes | Array of list IDs to scope all read operations to |
| `teamId` | no | Workspace ID (reserved for future use) |

To find list IDs manually:

1. Get your workspace ID:

```bash
curl -s -H "Authorization: pk_..." https://api.clickup.com/api/v2/team \
  | jq '.teams[] | {id, name}'
```

2. Get spaces in your workspace:

```bash
curl -s -H "Authorization: pk_..." \
  "https://api.clickup.com/api/v2/team/<teamId>/space?archived=false" \
  | jq '.spaces[] | {id, name}'
```

3. Get lists in a space:

```bash
curl -s -H "Authorization: pk_..." \
  "https://api.clickup.com/api/v2/space/<spaceId>/list?archived=false" \
  | jq '.lists[] | {id, name}'
```

## Commands

### `cu init`

Guided first-time setup. Prompts for your API token, verifies it, then shows all lists in your workspace for selection.

```bash
cu init
```

### `cu lists`

Update which lists are tracked. Opens the same interactive picker as `cu init` with your current lists pre-selected.

```bash
cu lists
```

### `cu tasks`

List all tasks assigned to me across configured lists.

```bash
cu tasks
```

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

Fields: `id`, `name`, `status`, `task_type`, `list`, `url`, `parent` (when task has a parent).

### `cu initiatives`

List tasks of type `Initiative` assigned to me. Output format is identical to `cu tasks`.

```bash
cu initiatives
```

> Initiatives are a custom task type in ClickUp. They appear here when `task_type === "Initiative"`.

### `cu update <taskId> -d <text>`

Update the description of a task. Markdown is supported.

```bash
cu update abc123 -d "## Summary\n\nFixed the regression from PR #42."
```

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --description <text>` | yes | New description (markdown supported) |

```json
{ "id": "abc123", "name": "Fix login bug" }
```

### `cu create -l <listId> -n <name> [options]`

Create a new task.

```bash
cu create -l list_id_1 -n "Implement dark mode" -d "Support system preference" -s "open"
```

| Flag | Required | Description |
|------|----------|-------------|
| `-l, --list <listId>` | yes | Target list ID |
| `-n, --name <name>` | yes | Task name |
| `-d, --description <text>` | no | Task description (markdown supported) |
| `-p, --parent <taskId>` | no | Parent initiative task ID |
| `-s, --status <status>` | no | Initial status (e.g. `open`, `in progress`) |

```json
{ "id": "xyz789", "name": "Implement dark mode", "url": "https://app.clickup.com/t/xyz789" }
```

## For AI Agents

- All output is JSON on stdout - pipe directly to `jq` or parse programmatically
- Errors print plain text to stderr and exit 1
- The `lists` array in config scopes all read operations - only tasks in those lists are returned
- Run `cu tasks` first to get current task IDs before calling `cu update` or using `-p`
- Task IDs are stable alphanumeric strings (e.g. `abc123`) - safe to use across commands

### Claude Code skill

A skill file is included at `skill/SKILL.md`. Install it so Claude Code can use `cu` autonomously:

```bash
mkdir -p ~/.config/opencode/skills/clickup
cp skill/SKILL.md ~/.config/opencode/skills/clickup/SKILL.md
```

Once installed, Claude Code will automatically invoke the skill when you ask it to interact with ClickUp.

## Development

```bash
npm install
npm test         # runs vitest (builds once via globalSetup, then runs all 25 tests)
npm run build    # tsup -> dist/
```
