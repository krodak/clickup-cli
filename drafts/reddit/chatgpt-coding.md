# r/ChatGPTCoding Draft

**Flair:** Other
**Title:** I built a CLI + skill file so my coding agent can read and update ClickUp tasks directly - the pattern works for any API

---

I work with AI coding agents daily (Claude Code, Codex, OpenCode) and got tired of being the middleman between my agent and ClickUp. Copy task description, paste into context, do the work, alt-tab back, update status, leave comment. Repeat. The agent can't see comments from the team, doesn't know the subtask structure, can't check the checklist. You're a slow, lossy bridge.

So I built a CLI for it, along with a skill file that teaches the agent what commands exist. The whole thing was built with Claude Opus 4 - not a single line written by hand.

I want to share the approach because I think the pattern generalizes beyond ClickUp.

## The pattern: CLI + SKILL.md

My takeaway from months of agent work: CLI tools paired with a skill file use way fewer tokens than MCP servers or browser automation. The agent runs a shell command, gets structured output, moves on. No protocol overhead, no server process, no massive context dumps.

The skill file is a small markdown document (couple hundred lines) with YAML frontmatter. It describes every command, what flags it takes, when to use it. Claude Code, Codex, and OpenCode all support this format natively. The agent loads it once and knows the full command surface without running `--help` on everything.

The output matters too. When the agent pipes a command, it gets clean markdown - no ANSI colors, no table borders, just information. Sized for context windows. When I run the same command in my terminal, I get colored tables with an interactive picker. Same binary, automatic switching via TTY detection.

This pattern - REST client + SKILL.md - could work for anything with an API. Your internal tools, your CRM, your deployment pipeline, your monitoring stack. If it has an API, an agent can learn to use it through a CLI.

## What a real session looks like

I say "check my sprint and work on the next task." The agent does this on its own:

```bash
cup sprint                                    # what's in my current sprint?
cup task abc123                               # read full details + comments
# ... agent reads requirements, writes code, runs tests ...
cup comment abc123 -m "Added retry logic with exponential backoff, see commit abc1234"
cup update abc123 -s "in review"              # move to review
```

I don't type any of these commands. The skill file taught the agent the workflow. It figures out the right sequence.

For standup, I just say "what's my standup?" and it runs:

```bash
cup summary                                   # completed, in progress, overdue
```

One command, full context.

## The build process

I use [obra superpowers](https://github.com/obra/superpowers/) for structured agent development. Every feature follows the same flow: brainstorm approaches, write a plan, dispatch sub-agents to implement in parallel, run tests, review. Each sub-agent gets a fresh context with just its task.

The prompt I use for most features:

```
Use brainstorming skill to prepare for implementing <task>,
ask as many questions as needed

Use writing-plan skill to prepare complete plan

Use subagent-driven-development and executing-plans
skills to implement complete plan and confirm it with tests

Do not make development yourself, act as orchestrator
for subagents, by using dispatching-parallel-agents.
```

Time tracking (5 commands, fully tested, documented, released to npm) took about 10 minutes of my time. Most of that was confirming the approach after brainstorming.

## What the tool covers

60+ commands: tasks, comments, sprints, checklists, time tracking, custom fields, tags, goals, docs, dependencies, attachments, templates, bulk operations. Multiple workspace profiles (`cup profile add personal`, `cup profile use work`). Ships as a Claude Code plugin, Codex skill, and OpenCode skill.

GitHub: https://github.com/krodak/clickup-cli
npm: `npm install -g @krodak/clickup-cli`

If you're thinking about building a CLI + skill for your own tools, happy to share more about the process. It's been the biggest productivity unlock for me this year.

---

**Notes:** r/ChatGPTCoding is touchy about self-promotion. This version leads with the reusable pattern (CLI + SKILL.md), not the tool itself. The build process section mirrors the vibecoding post. The question at the end invites discussion about building similar tools, not just about ClickUp. Post during US afternoon (1-4pm ET). Despite the subreddit name, the audience uses all AI coding tools - the framing is intentionally agent-generic.
