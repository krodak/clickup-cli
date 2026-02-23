---
name: clickup-cli
description: Use when reading or writing ClickUp tasks, initiatives, or need to interact with ClickUp data. Provides the `cu` CLI.
---

# ClickUp CLI (`cu`)

## Overview

`cu` is a CLI for ClickUp. JSON to stdout, errors to stderr with exit 1.

## Config

`~/.config/cu/config.json`:
```json
{
  "apiToken": "pk_...",
  "lists": ["list_id_1", "list_id_2"]
}
```

`teamId` is optional. To find list IDs:
```bash
# Get workspace ID
curl -s -H "Authorization: pk_..." https://api.clickup.com/api/v2/team | jq '.teams[] | {id, name}'
# Get lists in a space
curl -s -H "Authorization: pk_..." "https://api.clickup.com/api/v2/space/<spaceId>/list" | jq '.lists[] | {id, name}'
```

## Commands

```bash
cu tasks                                         # all tasks assigned to me
cu initiatives                                   # Initiative-type tasks assigned to me
cu update <taskId> --description "text"          # update description (markdown ok)
cu create --list <listId> --name "Task name"     # create task
cu create --list <listId> --name "Task name" --parent <initiativeId>  # subtask of initiative
```

Optional `create` flags: `--description`, `--parent`, `--status`

## Output Fields

Tasks array:
- `id` - task ID (use for update / create --parent)
- `name`
- `status` - current status string
- `task_type` - `"task"`, `"Initiative"`, etc.
- `list` - list name
- `url` - direct ClickUp URL
- `parent` - parent task ID (only present when task has a parent)

`create` returns: `{ id, name, url }`
`update` returns: `{ id, name }`

## Notes

- `cu initiatives` = tasks with `task_type === "Initiative"`, filtered client-side
- Fetches all pages automatically (ClickUp caps at 100/page)
- All lists in config are fetched in parallel
