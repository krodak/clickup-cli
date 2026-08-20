---
title: Colin's Torture Test
---

This is a torture test.
Here is an embedded table of contents:
::toc
::

# Text

First line with **bold**, _italics_, [underline]{underline}, ~~strikethrough~~, `code`, [link](https://shipstream.io)
Highlighted text: [Red]{highlight="red"}, [Grey]{highlight="grey"}, [Blue]{highlight="blue"}
Badges: :badge[Red]{color="red"}, :badge[Grey]{color="grey"}, :badge[Blue]{color="blue"}

::quote{size="large"}
This is a pull quote
::

> This is a block quote

This is right aligned {align="right"}

## This is centered H1 {align="center"}

#### Lists

- List item 1
  - Item 1-1
- List item 2

1. Numbered list item 1
2. Numbered list item 2

::toggle{title="Toggle list item one"}
This is the content that toggles
::

::toggle{title="Toggle list item two"}
:::toggle{title="Oh fun, nested toggles"}
Content of nested toggle
:::
::

- [ ] Checklist 1, unchecked
- [x] Checklist 2 - checked

```json {lineNumbers}
{ "key": "This is a JSON code block with line numbers enabled" }
```

::banner{color="pink-strong"}
This is a magenta colored banner
::

::table{widths="288,288,288"}

| Foo   | Bar   | Baz |
| ----- | ----- | --- |
| Hello | there | x   |
| ::    |
