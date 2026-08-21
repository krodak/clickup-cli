# ClickUp Flavored Markdown (CUFM)

CUFM is GitHub-flavored Markdown plus a small [Comark/MDC](https://comark.dev/syntax/markdown) component set. `cup task-sync push` (and `cup create` / `cup update`) compile it to ClickUp’s native editor document so headings stay tight, tables keep column widths, and Mermaid/tldraw diagrams become images plus toggles with their source.

AIs should write this dialect natively. The copy shipped with the agent skill (load this whenever authoring a task description) is [skills/clickup-cli/references/cufm.md](../skills/clickup-cli/references/cufm.md). Unknown `::components` are preserved as a fenced `cufm` code block rather than dropped.

## Standard Markdown

Headings (`#`–`####`), **bold**, _italic_, ~~strike~~, `code`, [links](https://example.com), lists, GFM tables, task lists (`- [ ]` / `- [x]`), fenced code, `---` dividers, and `![alt](path)` images all work.

Relative image paths are uploaded on push (`cup-{sha1}.ext`) and embedded.

### Line breaks and list indentation

ClickUp stores one block per line, so a few ordinary markdown habits do not mean what they look like:

- **Separate every block with a blank line.** A single newline inside a paragraph is a markdown soft break, which collapses to a space: `Line one\nline two` becomes `Line one line two`. Do not hard-wrap prose.
- **Nest ordered items by three spaces**, not two — the indent must clear the `1. ` marker. Two spaces makes the child a sibling and renumbers it. Bullets and `- [ ]` items nest by two.
- **Do not rely on lazy continuation lines inside a list item.** An unmarked line indented under `- item` is folded onto the item's own line.
- Trailing-double-space hard breaks become separate blocks; use a blank line instead.

## Attributes

Comark `{...}` after an element:

````mdc
# Centered {align="center"}
Right aligned {align="right"}
![diagram](./flow.png){width="640"}
[underline]{underline}
[Red]{highlight="red"}
[pink]{color="pink"}
Green block {background="green"}
```json {lineNumbers}
{"ok": true}
````

````

Base color tokens (text, highlight, badge, block background, and banners):

`grey`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`

Banners also support a `-strong` variant of each base (`pink-strong`, `blue-strong`, …). Text, highlight, badge, and block background channels do not. `cup task-sync doctor --list <id>` paints every supported channel/token combination.

ClickUp keeps a block background but resets inline text color in the same paragraph, so use `color` and `background` on separate lines.

## Components

### Blocks

```mdc
::toc
::

::toggle{title="Details"}
Hidden body. Nested toggles may use extra colons for readability, but
plain `::` nests correctly too — a lossless pull always writes the `::` form:

  :::toggle{title="Nested"}
  Inner body
  :::
::

::banner{color="blue"}
Callout body
::

::banner{color="pink-strong" icon="😱"}
Banner with emoji
::

::quote{size="large"}
Pull quote
::

::columns
  :::column{width="0.33"}
  Left
  :::
  :::column{width="0.33"}
  Middle
  :::
  :::column{width="0.34"}
  Right
  :::
::

::button{url="https://example.com" color="#646464"}
Click me
::

::frame{src="https://example.com" height="480"}
::

::table{widths="288,288,288"}
| Foo | Bar | Baz |
| --- | --- | --- |
| a   | b   | c   |
::

::mermaid{theme="github-light" width="640"}
flowchart LR
  A --> B
::

::tldraw{width="640"}
<complete .tldr JSON>
::

::sync-block{id="aa751cde-1335-4328-8359-2774c6cc77d5"}
This is shared by every clone of this Synced Content block.
::

::sync-block{id="aa751cde-1335-4328-8359-2774c6cc77d5"}
::
````

### What a toggle can hold

Toggle membership is recorded as an indent on each line, and the block embeds have no line to carry it. Text, headings, lists, code fences, images, and banners nest inside `::toggle` and stay there. **Tables, dividers, `::button`, and `::frame` do not** — they render after the toggle, not inside it, so keep the toggle and the table as siblings rather than nesting them.

GitHub alerts become banners:

```mdc
> [!NOTE]
> Useful context
```

`NOTE` → blue, `TIP` → green, `IMPORTANT` → purple, `WARNING` → yellow, `CAUTION` → pink-strong.

### Inline

```mdc
:badge[Red]{color="red"}
:user[Colin]{id="2685610"}
:task[86bbhau05]
:doc{view="26aqt-259" page="26aqt-84"}
```

`<@userId>` also becomes a real ClickUp mention.

## Synced Content

Synced Content uses the same ClickUp block ID for the original and every clone. On a lossless pull, cup writes the backing content into the first occurrence and emits later occurrences as empty references:

```mdc
::sync-block{id="aa751cde-1335-4328-8359-2774c6cc77d5"}
This is a synced content block.
::

Below is a clone of the above block:

::sync-block{id="aa751cde-1335-4328-8359-2774c6cc77d5"}
::
```

Create the initial Synced Content block in ClickUp, then pull with `CU_SESSION_TOKEN` (or `--session-token`) to capture its ID and backing Delta. An empty component adds another clone. A component body updates the shared backing content for every clone and therefore requires `CU_SESSION_TOKEN`; `task-sync push` also accepts `--session-token`. Define content only once per ID.

## Mermaid

A fenced ` ```mermaid ` block (or `::mermaid`) is rendered to a 2× PNG, uploaded, embedded, then followed by a toggle titled **mermaid source** containing the original source in one native code block. Theme default is `github-light`. Override with `::mermaid{theme="tokyo-night"}` or `cup task-sync push --mermaid-theme`.

A lossless pull collapses that image-plus-source-toggle pair back to a plain fence, so the fenced form is what a synced file always contains. Edit the fence and push; do not hand-edit the rendered image or the source toggle.

Only the diagram source is stored in the document — `theme` and `width` are render inputs, so a pull drops them and the next push re-renders with the defaults. For a theme you want to keep, use `cup task-sync push --mermaid-theme` rather than a per-diagram `::mermaid{theme="…"}` override.

If rendering fails, the source toggle is still kept and the reason is reported as a compile warning.

## tldraw

A fenced ` ```tldraw ` block (or `::tldraw`) containing a complete `.tldr` JSON document is rendered to a 2× PNG, uploaded, embedded, then followed by a toggle titled **tldraw source** containing the original JSON in one native code block. Set the displayed width with `::tldraw{width="640"}` or a fenced attribute.

tldraw rendering is loaded on demand through the external CLI. Install it once with `npm install --global @kitschpatrol/tldraw-cli`. If the CLI is missing or rendering fails, the source toggle is still kept and the reason is reported as a compile warning. Bodies are read verbatim, so pretty-printed `.tldr` JSON with blank lines is fine.

## Tables

Wrap a GFM table in `::table{widths="120,360"}` to set column widths in pixels. Without `widths`, cup estimates from cell text (`8 * chars + 24`, clamped 75–708).

## Frontmatter (task-sync files)

```yaml
---
clickup_id: 86bbhau05
title: Task name
list_id: '901400901320'
parent: ./epic.md
subtasks:
  - ./child.md
depends_on:
  - ./setup.md
blocks:
  - ./release.md
last_sync_at: 2026-08-20T15:04:05Z
last_sync_sha: null
last_remote_date_updated: '1787192906231'
last_remote_hash: '…'
content_hash: '…'
---
```

A directory of markdown files is one graph. `parent:` on the child is canonical (ClickUp has one parent). `subtasks:` on the parent is display order plus a consistency check. `depends_on` / `blocks` are waiting-on edges. Refs are relative paths or ClickUp ids. Sync rewrites paths after push/pull.

`cup task-sync push ./dir` creates missing tasks parents-first, writes descriptions, then adds missing dependency edges. `cup task-sync init <id> ./dir/` pulls the task and its subtasks into that directory.
