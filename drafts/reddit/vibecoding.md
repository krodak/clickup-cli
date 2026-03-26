Title: How to vibe-code CLI tool + skill to vibe-code longer without compacting

I work with AI agents daily and try really hard to minimise context switching and enable agent to use all the tools I'd normally use during development, which goes really well nowadays as agents are good into finding those tools themselves. But as my work requires ClickUp, I got tired of alt-tabbing to it for every status update, comment, or task description I just wanted to feed that into context, so I vibe-coded a CLI for it, along with a skill, so agent would pick it up automatically.

The whole project was built with Claude Opus 4, set to High mode via OpenCode (😉) Not a single line written by hand.

I want to share the build process, as I think the pattern is reusable for anyone who wants to vibe-code their own CLI tools, which I'd recommend as massive AI productivity boost

## The philosophy: CLI + SKILL.md

My biggest takeaway from working with agents is that CLI tools paired with a skill file use way fewer tokens than MCP servers or browser-based workflows. The agent runs a shell command, gets structured output, pipes it if needed, then moves on - no protocol overhead, no server process, no massive context dumps, just straight data

This matters because it means less compacting. I can work through longer sessions without the agent losing track of what it's doing. The skill file is small (a few hundred lines of markdown), the CLI output is compact (markdown when piped, JSON as alternative), and the agent doesn't need to hold much state.

I think this pattern - build a CLI, write a SKILL.md, hand it to your agent - could work for pretty much any service that has an API but no good agent integration. Your company's internal tools, your CRM, your deployment pipeline. If you can write a REST client and a markdown file describing how to use it, an agent can learn it.

## The build process

I use [obra superpowers](https://github.com/obra/superpowers/) for my agent workflow. It's a set of skills that teach Claude how to plan, implement, review, and ship code in a structured way. I'd say it's a nice sweet spot between writing simple prompts and running full looping frameworks like Ralph. You get structured planning and parallel execution without the complexity of a whole orchestration system.

After the initial setup (repo, npm, Homebrew, CI, tag-based releases, also done by agent), every new feature uses more or less the same prompt, relying heavy on superpowers skillset:

```
Use brainstorming skill to prepare for implementing <task>, // 1
ask as many questions as needed

Let's go with Approach <A/B/C> // 2

Use writing-plan skill to prepare complete plan as
.md file for <task>

Use subagent-driven-development and executing-plans
skills to implement complete plan and confirm it with tests

Do not make development yourself, act as orchestrator
for subagents, by using dispatching-parallel-agents.
If you have further questions, make decisions on your
own and document them in DECISIONS.md

Keep PROGRESS.md to track progress and carry on this
to your next agents. Point subagents to those files
and link to them in compacting summary.
```

I sometimes omit // 1 or // 1 + 2, depending whether I already cleared up with agent what to build

What this does in practice: the agent brainstorms approaches, picks one, writes a detailed plan, then spawns sub-agents to implement each part of the plan in parallel. It tracks progress in markdown files so when context gets long, the summary links back to the plan and decisions. Each sub-agent writes tests, the orchestrator reviews. I mostly just approve or redirect. I hardly ever need to answer some questions after brainstorming, mostly when I just sloped request ("let's add comments functionality")

The AGENTS.md in the repo instructs the agent to handle the release at the end of new features too - version bump, tag, push. So the whole cycle from "I want feature X" to "it's published on npm" requires almost no oversight from me. I trust the tests, and tests are honestly the only code I look at sometimes. But not really even that.

One feature (time tracking - 6 commands, fully tested, documented) took about ~10-15 minutes of my time. Most of that was reviewing the plan and confirming the approach, agent did everything else. But frankly at this point I trust it enough to not review smaller features

## What the tool actually does

`cup` is a ClickUp CLI. Three output modes:

- **In your terminal**: interactive tables with a task picker, colored output
- **Piped** (what agents see): clean Markdown, sized for context windows
- **`--json`**: structured data for scripts

```bash
# Morning standup
cup summary

# Agent reads a task, does the work, updates it
cup task PROJ-123
cup update PROJ-123 -s "in progress"
# ...does the work...
cup comment PROJ-123 -m "Fixed in commit abc1234"
cup update PROJ-123 -s "in review"
```

40+ commands covering tasks, comments, sprints, checklists, time tracking, custom fields, tags, dependencies, attachments. Each feature is fully tested. The repo includes a ready-to-use skill file for Claude Code, OpenCode, Codex (these are some of the few things I actually needed to review and test)

GitHub: https://github.com/krodak/clickup-cli
npm: https://www.npmjs.com/package/@krodak/clickup-cli

If you're thinking about building CLI tools for your own workflow, let me know. The CLI + skill file pattern has been the biggest productivity unlock for me recently
