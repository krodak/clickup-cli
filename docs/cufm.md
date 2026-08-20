# ClickUp Flavored Markdown (CUFM)

CUFM is GitHub-flavored Markdown plus a small [Comark/MDC](https://comark.dev/syntax/markdown) component set. `cup task-sync push` (and `cup create` / `cup update`) compile it to ClickUp’s native editor document so headings stay tight, tables keep column widths, and mermaid becomes an image plus a toggle with the source.

AIs should write this dialect natively. Unknown `::components` are preserved as a fenced `cufm` code block rather than dropped.

## Standard Markdown

Headings (`#`–`####`), **bold**, _italic_, ~~strike~~, `code`, [links](https://example.com), lists, GFM tables, task lists (`- [ ]` / `- [x]`), fenced code, `---` dividers, and `![alt](path)` images all work.

Relative image paths are uploaded on push (`cup-{sha1}.ext`) and embedded.

## Attributes

Comark `{...}` after an element:

````mdc
# Centered {align="center"}
Right aligned {align="right"}
![diagram](./flow.png){width="640"}
[underline]{underline}
[Red]{highlight="red"}
[pink]{color="pink"}
Green on green {color="green" background="green"}
```json {lineNumbers}
{"ok": true}
````

````

Color tokens (text, highlight, badge, block background, and banners):

`grey`, `red`, `orange`, `yellow`, `green`, `mint`, `teal`, `blue`, `indigo`, `purple`, `violet`, `pink`, `brown`

Each also has a `-strong` variant (`pink-strong`, `blue-strong`, …). Banners in the ClickUp UI use both. `cup task-sync doctor --list <id>` paints every token in every channel so you can see which chips the editor actually keeps.

## Components

### Blocks

```mdc
::toc
::

::toggle{title="Details"}
Hidden body. Nested toggles use extra colons:

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
````

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

## Mermaid

A fenced ` ```mermaid ` block (or `::mermaid`) is rendered to PNG, uploaded, embedded, then followed by a toggle titled **mermaid source** containing the original fence. Theme default is `github-light`. Override with `::mermaid{theme="tokyo-night"}` or `cup task-sync push --mermaid-theme`.

If rendering fails, the original fence is kept as a code block.

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
content_hash: '…'
---
```

A directory of markdown files is one graph. `parent:` on the child is canonical (ClickUp has one parent). `subtasks:` on the parent is display order plus a consistency check. `depends_on` / `blocks` are waiting-on edges. Refs are relative paths or ClickUp ids. Sync rewrites paths after push/pull.

`cup task-sync push ./dir` creates missing tasks parents-first, writes descriptions, then adds missing dependency edges. `cup task-sync init <id> ./dir/` pulls the task and its subtasks into that directory.
