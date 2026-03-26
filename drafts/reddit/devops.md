# r/devops Draft

**Flair:** Discussion
**Title:** How do you automate your PM tool? I built a scriptable ClickUp CLI and want to hear what others do

---

I got tired of clicking through the ClickUp web UI to update task statuses during deploys, so I built a CLI called `cup` that I could actually script against. It's been running in my pipelines for a while now and I figured I'd share it, but I'm also genuinely curious how other people handle PM tool automation.

**What it does**

It's a full ClickUp CLI with 60+ commands. The part that matters for automation: everything supports `--json` output and plays nice with pipes.

Pull tasks as JSON and filter with jq:

```bash
cup tasks --list 12345 --json | jq '.[] | select(.status == "in progress") | .name'
```

Update task status from a deploy script:

```bash
cup update $TASK_ID -s "deployed to staging"
```

Grab all tasks in a sprint and dump to a file for reporting:

```bash
cup sprint --json > sprint-snapshot.json
```

Batch-update multiple tasks at once:

```bash
cup bulk update --list 12345 --status "done" --filter-status "in review"
```

**Config**

It reads `CU_API_TOKEN` from the environment, so no config files needed in CI. You can also set the default team/space/list via env vars or a config file at `~/.config/cup/config.json`. In a container, just pass the token and go.

Multi-workspace setups are handled with profiles. `cup profile add staging` sets up a named profile with its own token and defaults. `cup profile use staging` switches to it. Useful if you have separate ClickUp workspaces for different environments or clients.

**Exit codes**

Commands exit non-zero on failure, so `set -e` in your scripts works as expected. API errors go to stderr, data goes to stdout. The usual Unix contract.

**Three output modes**

This is the part I actually find most useful day-to-day:

- In a terminal: interactive tables with colors, you can pick tasks and drill into details
- Piped to another command: switches to clean Markdown automatically (TTY detection)
- `--json`: structured output for scripting

The TTY detection means the same command works both when I'm poking around manually and when it's in a script. No separate "human mode" vs "script mode" flags.

**Install**

```bash
npm install -g @krodak/clickup-cli
```

Or Homebrew:

```bash
brew tap krodak/tap && brew install clickup-cli
```

Repo: [github.com/krodak/clickup-cli](https://github.com/krodak/clickup-cli). MIT, TypeScript, open source.

---

**My actual question for this sub:** do you automate your PM tool at all? I've seen teams that auto-move Jira tickets on merge, teams that sync GitHub issues to Linear, and teams that just... don't bother and do it manually. Where do you fall? And if you do automate it, what does your setup look like?

---

**Notes:**

- "Discussion" flair keeps it within Rule 4 (not pure self-promo) and Rule 5 (original thought)
- The closing question is genuine and invites discussion - this is important for r/devops engagement
- Post Tuesday-Thursday, US business hours
- If asked about Jira support: be honest, it's ClickUp-only. Don't promise Jira support unless you plan to build it
- Avoid mentioning AI agents prominently - the devops sub is skeptical of AI hype right now. The JSON mode speaks for itself
