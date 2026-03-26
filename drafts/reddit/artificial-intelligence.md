# r/ArtificialInteligence Draft

**Flair:** Project/Build
**Title:** Designing a CLI with three output modes - one for humans, one for LLMs, one for machines

---

**Disclosure: I built this tool.** It's open source (MIT), free to use.

I spent the last few months building a ClickUp CLI (`cup`) and the most interesting design problem wasn't the API integration - it was figuring out how to make the same tool work well for both humans and AI coding agents.

The solution was three distinct output modes, and the tradeoffs involved are worth sharing.

## The Problem

AI coding agents like Claude Code, Codex, and OpenCode can run shell commands. That means they can use CLIs. But traditional CLI output is designed for human eyes - ANSI color codes, box-drawing characters, aligned columns. An LLM reading that output wastes tokens on visual formatting it can't see and doesn't need.

On the other hand, JSON is great for machines but terrible for both humans and LLMs. Too verbose, too nested, too many tokens for what you actually get.

## Three Output Modes

**1. TTY mode (interactive terminal).** When stdout is a terminal, the CLI renders colored tables using box-drawing characters, and spawns an interactive task picker with @inquirer/prompts. This is for me, the human, sitting at my keyboard.

**2. Piped mode (markdown).** When stdout is piped - which is what happens when an AI agent runs a command - the CLI outputs clean markdown. No ANSI codes. Headers, bullet lists, inline code for IDs. This was the mode I iterated on the most.

The markdown mode strips away everything that doesn't carry information. A task that renders as a 40-column table in TTY mode becomes a flat markdown document with headers for each section. The token count drops significantly because you're not encoding whitespace alignment, box characters, or color escape sequences. I don't have formal benchmarks on token savings - it depends heavily on the task content and which model's tokenizer you're using - but the difference between a padded table with ANSI codes and a flat markdown list is substantial.

**3. JSON mode (`--json` flag).** Raw API responses for scripting and programmatic use. Piping to `jq`, feeding into other tools, CI pipelines.

The mode detection is simple: `process.stdout.isTTY` for the first two, an explicit flag for JSON. No config needed.

## Agent Integration

The CLI ships as a Claude Code plugin, a Codex skill, and an OpenCode skill. Each bundles a skill file - a markdown document that teaches the agent what commands exist, what flags they take, and when to use them. When the agent loads the skill, it ingests this file into its context.

This means the agent doesn't need to run `--help` on every command or guess at flag names. It already knows the full command surface. The skill file also includes workflow patterns - "when the user asks about their sprint, run `cup sprint --me`" - which lets the agent chain commands without explicit instructions.

For Claude Code, the plugin installs with:

```bash
claude plugin add $(npm root -g)/@krodak/clickup-cli
```

The skill file format is just YAML frontmatter + markdown, so it works with any agent framework that can read text files.

## Limitations

- The markdown output format is opinionated. I chose flat structure over nested indentation, which works well for task data but might not generalize to every domain.
- TTY detection isn't perfect in every environment. Some CI runners report isTTY=true. The JSON flag exists partly as a reliable override.
- The skill file is static. If the agent encounters an edge case the skill doesn't cover, it falls back to `--help` or guessing. I haven't implemented dynamic skill generation yet.
- Only works with ClickUp. The output mode architecture could apply to any API CLI, but this one is purpose-built for ClickUp's API.

## Lessons Learned

The biggest thing: LLMs don't need human-readable output and they don't need machine-readable output. They need something in between. Structured enough to parse, compact enough to fit in context windows, but still readable. Markdown works well for this - better than I expected when I started.

Also, the skill file matters more than the CLI design. An agent with a good skill file and a mediocre CLI outperforms an agent with a great CLI and no skill file. The instructions are the interface, not the flags.

**Links:**

- GitHub: https://github.com/krodak/clickup-cli
- npm: `npm install -g @krodak/clickup-cli`
- Homebrew: `brew tap krodak/tap && brew install clickup-cli`
- Docs: https://github.com/krodak/clickup-cli/blob/main/docs/commands.md

---

**Notes:** This sub has strict self-promo rules. One self-promotional post per 14 days max. The 150+ word technical breakdown requirement is met by the Three Output Modes + Agent Integration sections. Affiliation disclosure is at the top. No CTAs, no pricing, no waitlist. Post on a weekday, ideally Tuesday-Thursday. Use "Project/Build" flair. Note the subreddit name has a single 'l' - r/ArtificialInteligence.
