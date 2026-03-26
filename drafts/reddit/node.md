# r/node Draft

**Flair:** Show off
**Title:** I built an ESM-only CLI in TypeScript with dual TTY/pipe output modes - here's what I learned

---

I've been building a ClickUp CLI called `cup` for the past few months and wanted to share some of the implementation details since I ran into a bunch of interesting problems that other CLI authors might hit too.

**The dual output problem**

The thing I'm happiest with is how it handles output. When you run `cup tasks` in a terminal, you get colored interactive tables with a task picker (chalk + @inquirer/prompts). When you pipe it - like `cup tasks | head` - it detects the non-TTY context and switches to Markdown. And `--json` gives you structured output for scripting.

The detection is just `process.stdout.isTTY` but the tricky part was designing every command so the same data flows through three completely different formatters. I ended up with a pattern where commands return data objects and the output layer decides how to render. Sounds obvious in hindsight but I went through two bad designs before landing on it.

**ESM-only was painful but worth it**

The whole thing is ESM-only. Every import uses `.js` extensions. I went back and forth on this for a while but decided to just commit to it since Node is clearly heading that direction. The main pain point was testing - Vitest handles ESM well but some mocking patterns that work fine in CJS need different approaches. I have 700+ tests across 55 files now and the suite runs fast, so no complaints there.

**The symlink bug**

One weird problem worth sharing: detecting whether the CLI is being run directly vs imported as a module. The standard `import.meta.url === process.argv[1]` check breaks when the binary is installed via npm, because npm creates a symlink in your global bin directory. The symlink path doesn't match `import.meta.url`. I had to use `realpathSync` to resolve the symlink before comparing. Small thing, but it took a while to figure out why tests passed locally but the installed binary didn't launch.

**tsup for bundling**

I bundle everything into a single `dist/index.js` with tsup. This keeps the install fast and avoids the "node_modules in your global bin" problem. The config is dead simple - just point it at the entry, set format to ESM, target Node 22.

**Commander is still the right choice**

I looked at yargs, oclif, citty, and a few others. Commander won because it's the thinnest abstraction over what I actually needed. 60+ commands, nested subcommands, options parsing. It just works. The `.action()` handler pattern maps cleanly to one-file-per-command.

**@inquirer/prompts over the old inquirer**

If you haven't tried the new `@inquirer/prompts` package - it's way better than the old monolithic `inquirer`. Individual prompt imports, much smaller, and the TypeScript types are actually good. I use `select` and `checkbox` prompts for interactive task picking.

**One weird thing - AI agent output mode**

This started as just a regular CLI but I added a mode where piped output is optimized for AI coding agents to consume. Markdown tables, token-efficient formatting, that kind of thing. It ships as a Claude Code plugin, a Codex skill, and an OpenCode skill. Honestly this turned out to be one of the most used features.

The repo is at [github.com/krodak/clickup-cli](https://github.com/krodak/clickup-cli) if you want to look at the code. MIT licensed.

What CLI frameworks are you all using these days? I went with Commander but curious if anyone's moved to something else.

---

**Notes:**

- Post during US working hours (9am-12pm EST weekdays gets best engagement on r/node)
- "Show off" flair is the standard for project showcases
- Don't edit the post to add "thanks for the upvotes" if it does well
- If people ask about CJS support, be honest - it's ESM-only by design, not an oversight
