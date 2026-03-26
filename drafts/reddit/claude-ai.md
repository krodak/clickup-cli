# r/ClaudeAI Draft

**Flair:** Productivity
**Title:** I built a Claude Code plugin that gives Claude direct access to ClickUp - here's what the workflow actually looks like

---

I've been using Claude Code as my main coding tool for months, and the one thing that kept breaking my flow was context-switching to ClickUp. Copy task descriptions, paste them into the conversation, manually update statuses when done. It's tedious and it loses context every time.

So I built `cup` - a ClickUp CLI that ships as a native Claude Code plugin. Once installed, Claude can read your tasks, post comments, update statuses, manage checklists, track time, work with goals and docs - all without you leaving the terminal.

Here's what a real session looks like. I tell Claude "work on my next sprint task" and it runs:

```
cup sprint --me --status "in progress"
```

That gives Claude my current sprint tasks as markdown - optimized for its context window, not for a human terminal. Claude picks a task and digs in:

```
cup task 86a1b3nwp
```

Full description, subtasks, checklists, custom fields, comments - all dumped into context as markdown. Claude reads the requirements and starts coding.

When it's done, it posts a summary:

```
cup comment 86a1b3nwp -m "Implemented the retry logic..."
cup update 86a1b3nwp -s "review"
```

The key thing is that Claude does all of this on its own. I don't type the commands. The plugin's skill file teaches Claude what commands exist and when to use them, so it just does the right thing in context.

**What makes this different from MCP servers or custom scripts:**

The CLI has three output modes. When Claude pipes it, it gets clean markdown with no ANSI codes and no table formatting - just structured text designed to fit in a context window without wasting tokens. When I run it myself in the terminal, I get colored tables with an interactive task picker. Same tool, different interface depending on who's using it.

There are 60+ commands covering tasks, comments, checklists, custom fields, time tracking, views, tags, goals, docs, templates, bulk operations, and more. It handles pagination automatically and normalizes ClickUp's inconsistent API responses.

**Install as a Claude Code plugin:**

```bash
claude plugin add $(npm root -g)/@krodak/clickup-cli
```

The skill file and config get set up automatically. No manual AGENTS.md editing.

It also works with Codex (as a Codex skill) and OpenCode (as an OpenCode skill). The CLI itself is just a Node.js binary, so any agent that can run shell commands can use it.

**Disclosure:** I built this. It's open source (MIT), free, on npm and Homebrew.

GitHub: https://github.com/krodak/clickup-cli

---

**Notes:** Post during US morning hours (9-11am ET weekdays). r/ClaudeAI requires disclosure of building the tool - included at the bottom. The sub is receptive to Claude Code plugin content since it's a newer feature. Keep an eye on comments - people will ask about MCP vs CLI approach, have a good answer ready (CLI works everywhere, not just Claude Code; MCP requires a running server).
