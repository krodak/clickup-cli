# cup - ClickUp CLI

> A ClickUp CLI built for AI agents that also works well for humans. Outputs Markdown when piped (optimized for AI context windows), interactive tables when run in a terminal.

[![npm](https://img.shields.io/npm/v/@krodak/clickup-cli)](https://www.npmjs.com/package/@krodak/clickup-cli)
[![node](https://img.shields.io/node/v/@krodak/clickup-cli)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@krodak/clickup-cli)](./LICENSE)
[![CI](https://github.com/krodak/clickup-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/krodak/clickup-cli/actions/workflows/ci.yml)

```bash
npm install -g @krodak/clickup-cli && cup init
```

`cup` is the binary name. The previous `cu` name was retired in v0.21.0 to avoid conflict with the Unix [cu(1)](<https://en.wikipedia.org/wiki/Cu_(Unix_utility)>) utility.

## Talk to your agent

Install the CLI, add the skill file to your agent, and it works with ClickUp. No API knowledge needed.

> **"Read task abc123, do the work, then mark it in review and leave a comment with the commit hash."**

> **"What's my standup? What did I finish, what's in progress, what's overdue?"**

> **"Create a subtask under the initiative for the edge case we found."**

> **"Check my sprint and tell me what's behind schedule."**

> **"Update the description with your findings and flag blockers in a comment."**

The agent reads the skill file, picks the right `cup` commands, and handles everything. You don't need to learn the CLI - the agent does.

## Why a CLI and not MCP?

A CLI + skill file has fewer moving parts. No server process, no protocol layer. The agent already knows how to run shell commands - the skill file teaches it which ones exist. For tool-use with coding agents, CLI + instructions tends to work better than MCP in practice.

## Install

You need Node 22+ and a ClickUp personal API token (`pk_...` from [ClickUp Settings > Apps](https://app.clickup.com/settings/apps)).

<details open>
<summary>&nbsp;<img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" height="18" align="center">&nbsp;<strong>npm</strong></summary>

```bash
npm install -g @krodak/clickup-cli
cup init
```

</details>

<details>
<summary>&nbsp;<img src="https://img.shields.io/badge/Homebrew-FBB040?logo=homebrew&logoColor=black" height="18" align="center">&nbsp;<strong>Homebrew</strong></summary>

```bash
brew tap krodak/tap
brew install clickup-cli
cup init
```

</details>

## Set up your agent

The package includes a [skill file](https://agentskills.io) that teaches agents all available commands and when to use them. All three major coding agents support skills natively:

<details open>
<summary>&nbsp;<img src="https://img.shields.io/badge/Claude_Code-D97757?logo=anthropic&logoColor=white" height="18" align="center">&nbsp;<strong>Claude Code</strong></summary>

**Install as a [plugin](https://docs.anthropic.com/en/docs/claude-code/plugins)** (recommended):

```bash
claude plugin add $(npm root -g)/@krodak/clickup-cli
```

This registers the skill under the `clickup-cli:` namespace. Claude loads it automatically when you work with ClickUp tasks.

**Or install as a personal skill** (no namespace prefix):

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli
mkdir -p ~/.claude/skills/clickup
cp "$SKILL/SKILL.md" ~/.claude/skills/clickup/SKILL.md
```

</details>

<details>
<summary>&nbsp;<img src="https://img.shields.io/badge/Codex-412991?logo=openai&logoColor=white" height="18" align="center">&nbsp;<strong>Codex</strong></summary>

Codex supports [agent skills](https://developers.openai.com/codex/skills) across CLI, IDE extension, and web. Skills use the same `SKILL.md` format with YAML frontmatter.

**Install as a user skill** (available across all your projects):

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli
mkdir -p ~/.agents/skills/clickup
cp "$SKILL/SKILL.md" ~/.agents/skills/clickup/SKILL.md
```

**Or install as a project skill** (checked into your repo):

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli
mkdir -p .agents/skills/clickup
cp "$SKILL/SKILL.md" .agents/skills/clickup/SKILL.md
```

You can also use the built-in installer: `$skill-installer clickup`

</details>

<details>
<summary>&nbsp;<img src="https://img.shields.io/badge/OpenCode-24292e?logoColor=white" height="18" align="center">&nbsp;<strong>OpenCode</strong></summary>

```bash
SKILL=$(npm root -g)/@krodak/clickup-cli/skills/clickup-cli
mkdir -p ~/.config/opencode/skills/clickup
cp "$SKILL/SKILL.md" ~/.config/opencode/skills/clickup/SKILL.md
```

</details>

<details>
<summary>&nbsp;<strong>Other agents</strong></summary>

The skill file follows the [Agent Skills](https://agentskills.io) open standard. Copy `skills/clickup-cli/SKILL.md` into your agent's skill directory, system prompt, or `AGENTS.md`.

</details>

## What it covers

Full CRUD for the core ClickUp workflow:

**Tasks** - create, read, update, delete, duplicate, search, subtasks, assign, dependencies, links, multi-list, bulk status updates

**Comments** - post, edit, delete, threaded replies, notify all

**Docs** - list, read, create, edit, delete (v3 API)

**Time Tracking** - start/stop timer, log entries, list/update/delete history

**Checklists** - view, create, delete, add/edit/delete items

**Custom Fields** - list, set, remove values (dropdown, date, checkbox, text, etc.)

**Tags** - add/remove on tasks, space-level create/update/delete

**Goals & OKRs** - goals CRUD, key results CRUD

**Sprints** - auto-detect active sprint, flexible date parsing, config override

**Workspace** - spaces, folders, lists, members, task types, templates

**Attachments** - upload files to tasks, shown in detail views

[Full API coverage details](docs/api-coverage.md) | [Command reference](docs/commands.md)

## Output Modes

| Context        | Default                     | Override                     |
| -------------- | --------------------------- | ---------------------------- |
| Terminal (TTY) | Interactive tables + picker | `--json`                     |
| Piped (no TTY) | Markdown (optimized for AI) | `--json` or `CU_OUTPUT=json` |

Most commands scope to your assigned tasks by default - keeping output small and relevant for agent context windows.

## Configuration

### Profiles

Multiple profiles for different workspaces or accounts:

```bash
cup profile add work        # interactive setup
cup profile add personal    # another workspace
cup profile list            # show all profiles
cup profile use personal    # switch default
cup tasks -p work           # one-off profile override
```

### Config file

`~/.config/cup/config.json` (or `$XDG_CONFIG_HOME/cup/config.json`):

```json
{
  "defaultProfile": "work",
  "profiles": {
    "work": {
      "apiToken": "pk_...",
      "teamId": "12345678",
      "sprintFolderId": "optional"
    },
    "personal": {
      "apiToken": "pk_...",
      "teamId": "87654321"
    }
  }
}
```

Old flat configs (pre-profiles) are auto-migrated on first load.

### Environment variables

Environment variables override config file values:

| Variable       | Description                                                       |
| -------------- | ----------------------------------------------------------------- |
| `CU_API_TOKEN` | ClickUp personal API token (`pk_`)                                |
| `CU_TEAM_ID`   | Workspace (team) ID                                               |
| `CU_PROFILE`   | Profile name (overrides `defaultProfile`, overridden by `-p`)     |
| `CU_OUTPUT`    | Set to `json` to force JSON output when piped (default: markdown) |

When both `CU_API_TOKEN` and `CU_TEAM_ID` are set, the config file is not required. Useful for CI/CD and containerized agents.

## Custom Task IDs

ClickUp workspaces can configure custom task IDs with a prefix per space (e.g., `PROJ-123`, `DEV-42`). The CLI detects these automatically - any ID matching the `PREFIX-DIGITS` format (uppercase letters, hyphen, digits) is treated as a custom task ID.

All commands that accept task IDs work with both native IDs and custom IDs:

```bash
cup task PROJ-123
cup update DEV-42 --status done
cup comment PROJ-456 -m "Fixed in latest commit"
cup subtasks DEV-100
```

Custom ID resolution uses the `teamId` from your config, which is required (`cup init` sets it up).

**Task links with custom IDs:** The `cup link` command passes both task IDs in a single API request. When both IDs are custom, this works correctly. However, mixing custom and native IDs in a single link command may not work as expected because the ClickUp API applies the `custom_task_ids` flag to all IDs in the request.

## Development

```bash
npm install
npm test          # unit tests (vitest, tests/unit/)
npm run test:e2e  # e2e tests (tests/e2e/, requires CLICKUP_API_TOKEN in .env.test)
npm run build     # tsup -> dist/
```
