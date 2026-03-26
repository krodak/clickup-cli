# r/SideProject Draft

**Flair:** Side Project
**Title:** I got tired of alt-tabbing to ClickUp, so I built a CLI that works in my terminal and inside AI coding agents

---

I use ClickUp for everything at work - tasks, sprints, time tracking. And I use AI coding agents (Claude Code, Codex) for a lot of my actual coding. The problem? These agents can't talk to ClickUp. Every time I needed to check a task, update a status, or log time, I'd either alt-tab to the browser or copy-paste task descriptions manually into the agent's context.

So I built `cup` - a ClickUp CLI with 60+ commands.

The thing I'm most proud of is the triple output mode. Same command, three different outputs depending on how you run it:

```bash
# In your terminal - interactive tables with a task picker
cup tasks

# Piped to an AI agent - clean Markdown optimized for context windows
cup tasks | agent

# For scripts - structured JSON
cup tasks --json
```

The TTY mode has an interactive task picker where you can browse through tasks, hit enter to see details, and arrow through lists. When you pipe the output, it automatically switches to Markdown - no flag needed. This is the part that makes it actually useful with AI agents. The Markdown output is trimmed down to just what matters so you're not wasting context window tokens on table borders and padding.

Some commands I use constantly:

```bash
cup tasks --me --status "in progress"    # what am I working on right now
cup comments 12345                       # read the comment thread on a task
cup sprint                               # current sprint overview
cup timer start 12345                    # start tracking time from terminal
cup profile use work                     # switch to my work workspace
```

It ships as a Claude Code plugin too, so the agent knows what commands are available without you having to explain it. The repo has demo GIFs showing both interactive terminal mode and agent mode in action.

It also supports multiple profiles if you work across different ClickUp workspaces - `cup profile add`, `cup profile use`, `cup profile list`.

**Tech:** TypeScript, Commander, tsup for bundling, 700+ Vitest tests across 55 files. MIT license.

Install via Homebrew (`brew tap krodak/tap && brew install clickup-cli`) or npm (`npm i -g @krodak/clickup-cli`).

GitHub: https://github.com/krodak/clickup-cli

I've been using it daily for a few months now and can't go back to the browser-first workflow.

---

**Notes:**

- Best posted on a weekday morning (US time), Mon-Wed tend to get more traction
- The sub has AI project fatigue - the post leads with CLI craftsmanship (triple output, interactive picker, Homebrew) and only mentions AI agents as a use case, not the identity of the project
- Include a screenshot or GIF of the interactive task picker if possible - visual posts do much better here. Demo GIFs are in the repo at demos/tty-mode.gif and demos/agent-mode.gif
