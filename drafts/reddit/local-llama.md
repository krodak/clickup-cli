# r/LocalLLaMA Draft

**Flair:** Tools
**Title:** I built a CLI that gives any LLM agent read/write access to ClickUp - model-agnostic, works with local models

---

One problem I kept hitting with agent setups: they can read code and write code, but they can't interact with project management. They don't know what task to work on, can't update status when they're done, can't read comments from the team. So I built `cup`, a ClickUp CLI designed to be called by LLM agents.

**Why this works with local models**

The key design decision: when output is piped (not a terminal), the CLI automatically switches to Markdown. No special flags. Your agent runs `cup tasks --list 12345` and gets back a clean Markdown document it can parse. This works with any model that can read text - llama, mistral, qwen, whatever you're running.

For structured consumption there's `--json` which returns typed JSON objects. If your agent framework can handle tool calls with JSON responses, that's the better path.

**The token efficiency thing**

I spent real time on making the piped Markdown output compact. No decorative borders, no redundant headers, no wasted tokens. When your context window is 8k or 32k, every token you burn on formatting is a token you can't use for reasoning. The Markdown output is designed to be information-dense.

**What an agent workflow looks like**

```bash
# Agent reads current sprint tasks
cup sprint

# Agent picks a task and reads its details
cup task abc123

# Agent reads comments/discussion on the task
cup comments abc123

# Agent does the work...

# Agent updates the task status
cup update abc123 -s "in review"

# Agent posts a comment about what it did
cup comment abc123 -m "Implemented the validation logic in src/validators/input.ts"
```

Each of those commands returns text or JSON that fits in a context window. The agent doesn't need browser automation or API knowledge - just shell access.

**Skill files**

The tool ships with a skill file (a markdown doc that tells an agent what commands are available and how to use them). The format is YAML frontmatter + markdown, so you can adapt it for whatever agent framework you use. It works as a Claude Code plugin, a Codex skill, and an OpenCode skill out of the box. But the skill file is just a text file - nothing stops you from feeding it to your own agent harness.

**Not locked to any provider**

The CLI itself is just a Node.js binary. If you're running agents through a local setup with ollama or llama.cpp, you can just install it globally and give your agent access to it. The piped output mode doesn't care what's consuming it.

There are 60+ commands covering tasks, sprints, comments, checklists, time tracking, goals, docs, templates, and bulk operations. 700+ tests.

Install: `npm install -g @krodak/clickup-cli`

Repo: [github.com/krodak/clickup-cli](https://github.com/krodak/clickup-cli) - MIT, open source.

---

What are you all using to give your agents access to external services? I've seen MCP servers, custom tool definitions, and plain shell scripts. Curious what's working for people with local setups specifically.

---

**Notes:**

- "Tools" flair is the right category
- The 10% self-promo rule: the post provides genuine information about agent tooling patterns and asks a real question. Not just a product dump
- LocalLLaMA cares about: token efficiency, model-agnostic design, working without cloud dependencies. Hit all three
- Do NOT edit to add Claude Code branding if it gets traction. The sub is allergic to corporate posts
- Post anytime - this sub is global and active 24/7
- If someone asks about MCP integration, that's a good follow-up comment to engage with
