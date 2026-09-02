# Export: knowledge transfer out of ClickUp

Status: approved for implementation. The navigation layer (section 5) is
provisional and will be revisited after the storage layer ships.

## Goal

Produce a lossless, human- and agent-readable archive of a ClickUp
workspace, or slices of it, using only the public API. Motivation: an
organization off-boarding from ClickUp. ClickUp's native exports are
spreadsheets (task CSV, per-view CSV/XLSX), single-doc PDF/HTML/MD, and
per-task attachment zips; none preserve comment threads, subtask trees,
custom fields, downloaded attachments, or docs in bulk. Third-party ETL
services (Flatly etc.) produce the same tabular shape. This design covers
the gap.

## Non-goals

- Whiteboards, dashboards, automations, form submissions: no public API.
  Documented as manual steps.
- Time entries and time-in-status: skipped by decision, cheap to add later.
- Migration-ready import format for another tool: the JSON is lossless
  raw API output, so any importer can be written on top of it later.

## Commands

```
cup export user <userId|me|email>   assigned tasks, including closed and archived
cup export team <spaceIdOrName>     every list in a space
cup export roadmap <listId>         a list, initiatives grouped with subtask trees
cup export initiatives <listId>     only initiative-typed tasks in a list (subset of roadmap)
cup export docs                     every workspace doc as markdown page trees
cup export all                      everything; plans, warns, requires confirmation
```

Shared flags:

| Flag               | Default            | Meaning                                             |
| ------------------ | ------------------ | --------------------------------------------------- |
| `--out <dir>`      | `./clickup-export` | Archive root. All slices compose into the same dir. |
| `--refresh`        | off                | Re-fetch tasks already in the manifest.             |
| `--no-attachments` | off                | Skip attachment binaries (metadata still written).  |
| `--dry-run`        | off                | Run discovery, print the plan, fetch nothing.       |
| `--rpm <n>`        | 90                 | Request throttle. Below the 100/min Business limit. |
| `--yes`            | off                | Skip confirmation (required for `all` in non-TTY).  |
| `--json`           | off                | Machine-readable summary on completion.             |

## Task bundle (storage layer)

Every task is stored exactly once, keyed by native ID, regardless of which
slice discovered it:

```
tasks/<taskId>/
  task.json          full GET /task response with include_markdown_description,
                     include_subtasks; lossless
  task.md            rendered: header block, custom fields (dropdown ids
                     resolved to labels), description, checklists, subtasks
                     (links), dependencies, attachments (local paths)
  comments.json      all comments, paginated past 25, with reply threads inlined
  comments.md        rendered thread
  attachments/       downloaded binaries, original filenames, deduped by
                     attachment id; attachments.json holds metadata
```

Bundle cost: 1 (task) + ceil(comments/25) + replies-per-threaded-comment +
attachment downloads. Subtasks are their own bundles; the parent links to
them.

Links in `task.md` to other tasks are relative when the target is in the
archive, and ClickUp URLs marked `(not exported)` when it is not.

## Engine (two-phase)

1. **Discover.** Walk the slice's scope using list endpoints (100 tasks per
   request), producing a plan: task IDs with slice membership. Subtasks are
   discovered recursively. `archived=true` and `include_closed=true` always.
2. **Fetch.** For each planned task not already in the manifest (or all,
   with `--refresh`), fetch the bundle and write it. Bounded concurrency
   (4) via `runInBatches`. Progress on stderr with count, ETA.

Discovery is cheap enough to re-run after any crash; the manifest is the
resume state. `--dry-run` runs step 1 only.

`manifest.json`: `{ version, workspace, tasks: { [id]: { fetchedAt, slices[],
contentHash } }, docs: {...}, slices: { [name]: { kind, scope, exportedAt,
taskCount } } }`. Written atomically after every N bundles.

## Rate limiting

Token bucket in `ClickUpClient._fetch` at `--rpm` requests per minute,
plus the existing 429/5xx backoff. Attachment downloads go through the same
bucket.

## API gaps closed

- Comments pagination (`start`, `start_id`) on task comments.
- `archived`, `include_markdown_description`, `include_subtasks` on task
  fetches.
- v3 docs cursor pagination.
- Workspace/space/folder-level custom field definitions (for label
  resolution of fields not on a list).

## Navigation layer (provisional)

Each slice writes `slices/<kind>-<slug>/README.md`, an index with relative
links into `tasks/`. The index shape differs per slice: roadmap groups by
initiative with subtask trees; team mirrors folder/list hierarchy; user
groups by status then month. A root `README.md` lists every slice present.

Open question, to resolve after storage ships: a space-manager view may
prefer a directory tree mirroring ClickUp hierarchy (folder/list/task) with
symlinks into `tasks/`, so the archive browses like the ClickUp sidebar.
Possible as an additional layout flag; does not affect the storage layer.

## Docs

`docs/<docSlug>/` with one markdown file per page, nested to mirror the
page tree, plus `doc.json`. Uses v3 pages with `content_format=text/md`.

## Testing

Unit: bundle rendering, manifest, discovery walk, plan output, rate
limiter, with mocked client. E2E: a dedicated `E2E Export` space in the
personal workspace with a small fixture graph (initiative, subtasks,
comments with replies, an attachment, an archived task); export it to a
temp dir and assert on the file tree.
