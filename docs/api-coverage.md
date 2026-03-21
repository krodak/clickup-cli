# API Coverage

Status: :white_check_mark: implemented | :construction: planned | :no_entry_sign: won't add

## Tasks

| Feature              | Command                 | Status             |
| -------------------- | ----------------------- | ------------------ |
| List my tasks        | `cup tasks`             | :white_check_mark: |
| Get task details     | `cup task <id>`         | :white_check_mark: |
| Create task          | `cup create`            | :white_check_mark: |
| Update task          | `cup update <id>`       | :white_check_mark: |
| Delete task          | `cup delete <id>`       | :white_check_mark: |
| Search tasks         | `cup search <query>`    | :white_check_mark: |
| Open in browser      | `cup open <query>`      | :white_check_mark: |
| List subtasks        | `cup subtasks <id>`     | :white_check_mark: |
| Assign / unassign    | `cup assign <id>`       | :white_check_mark: |
| Duplicate task       | `cup duplicate <id>`    | :white_check_mark: |
| Create from template | `cup create --template` | :white_check_mark: |
| Bulk operations      | `cup bulk status`       | :white_check_mark: |

## Dependencies & Relations

| Feature              | Command                    | Status             |
| -------------------- | -------------------------- | ------------------ |
| Add dependency       | `cup depend <id>`          | :white_check_mark: |
| Remove dependency    | `cup depend <id> --remove` | :white_check_mark: |
| Add/remove task link | `cup link <id> <linksTo>`  | :white_check_mark: |

## Multi-list

| Feature          | Command                  | Status             |
| ---------------- | ------------------------ | ------------------ |
| Add task to list | `cup move <id> --add`    | :white_check_mark: |
| Remove from list | `cup move <id> --remove` | :white_check_mark: |

## Sprints & Planning

| Feature                  | Command                 | Status             |
| ------------------------ | ----------------------- | ------------------ |
| Active sprint tasks      | `cup sprint [--folder]` | :white_check_mark: |
| List all sprints         | `cup sprints`           | :white_check_mark: |
| Assigned tasks by status | `cup assigned`          | :white_check_mark: |
| Standup summary          | `cup summary`           | :white_check_mark: |
| Overdue tasks            | `cup overdue`           | :white_check_mark: |
| Recently updated         | `cup inbox`             | :white_check_mark: |

## Comments

| Feature                  | Command                               | Status             |
| ------------------------ | ------------------------------------- | ------------------ |
| List comments            | `cup comments <id>`                   | :white_check_mark: |
| Post comment             | `cup comment <id>`                    | :white_check_mark: |
| Edit comment             | `cup comment-edit <id>`               | :white_check_mark: |
| Task + comments combined | `cup activity <id>`                   | :white_check_mark: |
| Delete comment           | `cup comment-delete <id>`             | :white_check_mark: |
| Threaded replies         | `cup replies <id>` / `cup reply <id>` | :white_check_mark: |

## Checklists

| Feature          | Command                                   | Status             |
| ---------------- | ----------------------------------------- | ------------------ |
| View checklists  | `cup checklist view <id>`                 | :white_check_mark: |
| Create checklist | `cup checklist create <id> <name>`        | :white_check_mark: |
| Delete checklist | `cup checklist delete <id>`               | :white_check_mark: |
| Add item         | `cup checklist add-item <id> <name>`      | :white_check_mark: |
| Edit item        | `cup checklist edit-item <id> <itemId>`   | :white_check_mark: |
| Delete item      | `cup checklist delete-item <id> <itemId>` | :white_check_mark: |

## Custom Fields

| Feature               | Command                   | Status             |
| --------------------- | ------------------------- | ------------------ |
| Set field value       | `cup field <id> --set`    | :white_check_mark: |
| Remove field value    | `cup field <id> --remove` | :white_check_mark: |
| List available fields | `cup fields <listId>`     | :white_check_mark: |

## Tags

| Feature                | Command                           | Status             |
| ---------------------- | --------------------------------- | ------------------ |
| Add/remove tag on task | `cup tag <id>`                    | :white_check_mark: |
| List space tags        | `cup tags <spaceId>`              | :white_check_mark: |
| Create space tag       | `cup tag-create <spaceId> <name>` | :white_check_mark: |
| Update space tag       | `cup tag-update <spaceId> <name>` | :white_check_mark: |
| Delete space tag       | `cup tag-delete <spaceId> <name>` | :white_check_mark: |

## Time Tracking

| Feature        | Command                        | Status             |
| -------------- | ------------------------------ | ------------------ |
| Start timer    | `cup time start <id>`          | :white_check_mark: |
| Stop timer     | `cup time stop`                | :white_check_mark: |
| Timer status   | `cup time status`              | :white_check_mark: |
| Log time entry | `cup time log <id> <duration>` | :white_check_mark: |
| List entries   | `cup time list`                | :white_check_mark: |
| Update entry   | `cup time update <id>`         | :white_check_mark: |
| Delete entry   | `cup time delete <id>`         | :white_check_mark: |

## Workspace

| Feature        | Command                 | Status             |
| -------------- | ----------------------- | ------------------ |
| List spaces    | `cup spaces`            | :white_check_mark: |
| List lists     | `cup lists <spaceId>`   | :white_check_mark: |
| Check auth     | `cup auth`              | :white_check_mark: |
| List folders   | `cup folders <spaceId>` | :white_check_mark: |
| List members   | `cup members`           | :white_check_mark: |
| Task types     | `cup task-types`        | :white_check_mark: |
| Task templates | `cup templates`         | :white_check_mark: |

## Goals & Key Results

| Feature           | Command                              | Status             |
| ----------------- | ------------------------------------ | ------------------ |
| List goals        | `cup goals`                          | :white_check_mark: |
| Create goal       | `cup goal-create <name>`             | :white_check_mark: |
| Update goal       | `cup goal-update <goalId>`           | :white_check_mark: |
| Delete goal       | `cup goal-delete <goalId>`           | :white_check_mark: |
| List key results  | `cup key-results <goalId>`           | :white_check_mark: |
| Create key result | `cup key-result-create <goalId> <n>` | :white_check_mark: |
| Update key result | `cup key-result-update <krId>`       | :white_check_mark: |
| Delete key result | `cup key-result-delete <krId>`       | :white_check_mark: |

## Docs

| Feature          | Command                              | Status             |
| ---------------- | ------------------------------------ | ------------------ |
| Search docs      | `cup docs [query]`                   | :white_check_mark: |
| View doc / page  | `cup doc <docId> [pageId]`           | :white_check_mark: |
| All page content | `cup doc-pages <docId>`              | :white_check_mark: |
| Create doc       | `cup doc-create <title>`             | :white_check_mark: |
| Create page      | `cup doc-page-create <docId> <name>` | :white_check_mark: |
| Edit page        | `cup doc-page-edit <docId> <pageId>` | :white_check_mark: |
| Delete doc       | `cup doc-delete <docId>`             | :white_check_mark: |
| Delete page      | `cup doc-page-delete <docId> <pId>`  | :white_check_mark: |

## Attachments

| Feature          | Command                    | Status             |
| ---------------- | -------------------------- | ------------------ |
| Upload file      | `cup attach <id> <file>`   | :white_check_mark: |
| List attachments | shown inline in `cup task` | :white_check_mark: |

## Setup

| Feature           | Command                  | Status             |
| ----------------- | ------------------------ | ------------------ |
| First-time setup  | `cup init`               | :white_check_mark: |
| Get/set config    | `cup config`             | :white_check_mark: |
| Shell completions | `cup completion <shell>` | :white_check_mark: |

## Won't add

| Feature                 | Why                                                                         |
| ----------------------- | --------------------------------------------------------------------------- |
| Webhooks                | Server-side. A CLI can't listen for events.                                 |
| OAuth flow              | `cup init` already handles auth with API tokens.                            |
| Guest/ACL               | Enterprise admin. Not what you reach for in a terminal.                     |
| Chat/DM                 | Use the ClickUp app. Chat doesn't belong in a CLI.                          |
| Audit logs              | Enterprise admin.                                                           |
| User/group management   | Too destructive for a CLI - removing someone from a workspace is permanent. |
| View CRUD               | Views are visual layouts. Configure them in the UI.                         |
| List/Folder/Space CRUD  | Structural changes. Set these up in the UI.                                 |
| View/List/Chat comments | API only supports task-level comments.                                      |
| User Groups             | Enterprise admin feature.                                                   |
| Shared Hierarchy        | Enterprise admin feature.                                                   |

## API Limitations

These features exist in the ClickUp UI but aren't possible through the API:

| Feature                   | Limitation                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Comment attachments       | API only supports task-level attachments (`cup attach`), not files within comments |
| @mention individual users | API provides `--notify-all` but no way to target specific users via @syntax        |
| Comment reactions         | No API endpoint for adding or viewing reactions                                    |
| ClickUp Brain / AI        | No public API                                                                      |
| In-comment checklists     | Only task-level checklists are supported via API                                   |
| Voice notes / Video       | Recording is a UI-only feature                                                     |
