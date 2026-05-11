# Chat Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full ClickUp Chat support — channel management, messaging, replies, and reactions — via the v3 Chat API (19 endpoints, 18 CLI commands).

**Architecture:** New `chat` subcommand group with 4 command modules (chat.ts, chat-message.ts, chat-reply.ts, chat-reaction.ts). API client extended with 18 v3 methods using existing `requestV3`/`requestV3Array`. Chat messages use raw markdown (not Quill Delta blocks like task comments) via `content_format: text/md`.

**Tech Stack:** TypeScript ESM, Commander (subcommand group), ClickUp API v3, Vitest

**Spec:** `docs/superpowers/specs/2026-04-29-chat-support-design.md`

**Baseline:** 1055 tests, 75 files

---

### Task 1: API client — channel + messaging methods

**Files:**
- Modify: `src/api.ts`
- Create: `tests/unit/api-chat.test.ts`

Add all 18 API client methods for channels, messages, replies, and reactions. All use v3 endpoints via `requestV3`/`requestV3Array`.

- [ ] **Step 1: Add Chat types to api.ts**

```typescript
export interface ChatChannel {
  id: string
  name: string
  description?: string
  topic?: string
  type: 'CHANNEL' | 'DM' | 'GROUP_DM'
  visibility: 'PUBLIC' | 'PRIVATE'
  creator: string
  created_at: string
  workspace_id: string
  archived: boolean
  latest_comment_at?: string
}

export interface ChatMessage {
  id: string
  content: string
  type: 'message' | 'post'
  user_id: string
  date: number
  parent_channel: string
  parent_message?: string
  resolved: boolean
  replies_count?: number
  post_data?: { title?: string }
}

export interface ChatReaction {
  reaction: string
  user_id: string
  date: number
}

export interface ChatMember {
  user: { id: string; username?: string; name?: string; email: string }
  type: string
}
```

- [ ] **Step 2: Add channel management methods**

```typescript
async getChatChannels(opts?: {
  isFollower?: boolean
  includeClosed?: boolean
  channelTypes?: string
  limit?: number
}): Promise<ChatChannel[]>

async getChatChannel(channelId: string): Promise<ChatChannel>

async createChatChannel(name: string, opts?: {
  visibility?: 'PUBLIC' | 'PRIVATE'
  topic?: string
  userIds?: string[]
}): Promise<ChatChannel>

async createDirectMessage(userIds?: string[]): Promise<ChatChannel>

async createLocationChannel(
  location: { id: string; type: 'space' | 'folder' | 'list' },
  opts?: { description?: string; topic?: string; visibility?: string; userIds?: string[] },
): Promise<ChatChannel>

async updateChatChannel(channelId: string, opts: {
  name?: string
  description?: string
  topic?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}): Promise<ChatChannel>

async deleteChatChannel(channelId: string): Promise<void>

async getChatChannelMembers(channelId: string, limit?: number): Promise<ChatMember[]>

async getChatChannelFollowers(channelId: string, limit?: number): Promise<ChatMember[]>
```

All use `requestV3` with base path `/workspaces/${this.teamId}/chat/channels`.

- [ ] **Step 3: Add messaging methods**

```typescript
async getChatMessages(channelId: string, opts?: { limit?: number }): Promise<ChatMessage[]>

async sendChatMessage(channelId: string, content: string, opts?: {
  type?: 'message' | 'post'
  postTitle?: string
}): Promise<ChatMessage>

async updateChatMessage(messageId: string, content: string): Promise<ChatMessage>

async deleteChatMessage(messageId: string): Promise<void>
```

- [ ] **Step 4: Add reply methods**

```typescript
async getChatMessageReplies(messageId: string, opts?: { limit?: number }): Promise<ChatMessage[]>

async createChatMessageReply(messageId: string, content: string): Promise<ChatMessage>
```

- [ ] **Step 5: Add reaction methods**

```typescript
async getChatMessageReactions(messageId: string): Promise<ChatReaction[]>

async createChatMessageReaction(messageId: string, emoji: string): Promise<ChatReaction>

async deleteChatMessageReaction(messageId: string, emoji: string): Promise<void>
```

- [ ] **Step 6: Write API tests**

Create `tests/unit/api-chat.test.ts` with tests for each method verifying:
- Correct URL construction
- Correct HTTP method
- Correct body serialization
- Response field extraction

Minimum 18 tests (one per method).

- [ ] **Step 7: Run tests and commit**

Run: `npm test && npm run typecheck && npm run lint:fix`
Commit: `feat: add Chat API client methods (channels, messages, replies, reactions)`

---

### Task 2: Chat commands — channels + send + read (MVP)

**Files:**
- Create: `src/commands/chat.ts`
- Create: `src/commands/chat-message.ts`
- Modify: `src/index.ts`
- Modify: `src/commands/metadata.ts`
- Create: `tests/unit/commands/chat.test.ts`
- Create: `tests/unit/commands/chat-message.test.ts`

Implement the core commands: list channels, get channel, send message, list messages.

- [ ] **Step 1: Create chat.ts — channel formatting**

```typescript
export function formatChannelsTable(channels: ChatChannel[]): string
export function formatChannelsMarkdown(channels: ChatChannel[]): string
export function formatChannelDetail(channel: ChatChannel): string
```

- [ ] **Step 2: Create chat-message.ts — message formatting**

```typescript
export function formatMessages(messages: ChatMessage[]): string
export function formatMessagesMarkdown(messages: ChatMessage[]): string
```

- [ ] **Step 3: Register chat subcommand group in index.ts**

Follow the `checklist` pattern — `const chatCmd = program.command('chat').description('...')` with subcommands.

Register:
- `cup chat channels [--all] [--type] [--json]`
- `cup chat channel <channelId> [--json]`
- `cup chat send <channelId> -m <message> [--post --title] [--json]`
- `cup chat messages <channelId> [--limit] [--json]`

- [ ] **Step 4: Add metadata entry**

- [ ] **Step 5: Write tests for channel list/detail and message send/read**

- [ ] **Step 6: Run tests and commit**

Commit: `feat: add cup chat channels, channel, send, and messages commands`

---

### Task 3: Chat commands — channel management

**Files:**
- Modify: `src/commands/chat.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/commands/chat.test.ts`

Add channel CRUD and member/follower listing.

- [ ] **Step 1: Add channel-create, dm, channel-update, channel-delete commands**

```bash
cup chat channel-create <name> [--private] [--topic] [--space|--folder|--list]
cup chat dm <userIds...>
cup chat channel-update <id> [--name] [--topic] [--visibility]
cup chat channel-delete <id> [--confirm]
cup chat members <channelId>
cup chat followers <channelId>
```

- [ ] **Step 2: Write tests**

- [ ] **Step 3: Run tests and commit**

Commit: `feat: add chat channel management commands`

---

### Task 4: Chat commands — replies + reactions + edit/delete

**Files:**
- Create: `src/commands/chat-reply.ts`
- Create: `src/commands/chat-reaction.ts`
- Modify: `src/index.ts`
- Create: `tests/unit/commands/chat-reply.test.ts`
- Create: `tests/unit/commands/chat-reaction.test.ts`

- [ ] **Step 1: Add reply commands**

```bash
cup chat reply <messageId> -m "text"
cup chat replies <messageId> [--limit]
```

- [ ] **Step 2: Add reaction commands**

```bash
cup chat react <messageId> --emoji "thumbsup"
cup chat unreact <messageId> --emoji "thumbsup"
cup chat reactions <messageId>
```

- [ ] **Step 3: Add message edit/delete**

```bash
cup chat message-update <messageId> -m "new text"
cup chat message-delete <messageId> [--confirm]
```

- [ ] **Step 4: Write tests**

- [ ] **Step 5: Run tests and commit**

Commit: `feat: add chat replies, reactions, and message edit/delete`

---

### Task 5: Documentation, metadata, completions, e2e

**Files:**
- Modify: `docs/commands.md`
- Modify: `skills/clickup-cli/SKILL.md`
- Modify: `README.md`
- Modify: `docs/api-coverage.md`
- Modify: `src/commands/metadata.ts`
- Modify: `src/commands/completion.ts`
- Create: `tests/e2e/chat.e2e.ts`

- [ ] **Step 1: Add chat command section to docs/commands.md**

Full reference with examples, flag tables, and notes.

- [ ] **Step 2: Update SKILL.md with chat commands**

Add to the Write section command table.

- [ ] **Step 3: Update README.md**

Add "Chat" to the "What it covers" feature list.

- [ ] **Step 4: Update api-coverage.md**

Add Chat section with all 18 endpoints.

- [ ] **Step 5: Update metadata.ts with quick reference entries**

- [ ] **Step 6: Add shell completions**

Add `chat` to `bashSpecialCaseCommands`, add completion cases for all three shells.

- [ ] **Step 7: Write e2e tests**

Create `tests/e2e/chat.e2e.ts`:
- Create a channel, send a message, reply, react, list messages, cleanup (delete channel)
- Graceful handling if chat isn't available on the workspace

- [ ] **Step 8: Sync docs, run full verification**

```bash
node --import tsx scripts/sync-command-docs.ts
npm run typecheck && npm run lint && npm test && npm run build
```

- [ ] **Step 9: Commit**

Commit: `docs: add chat command documentation and e2e tests`

---

### Task 6: Final verification and release

- [ ] **Step 1: Run full test suite**
- [ ] **Step 2: Run e2e tests**
- [ ] **Step 3: Bump version (minor: 1.27.0)**
- [ ] **Step 4: Push, wait for CI, write release notes**
- [ ] **Step 5: Update Homebrew tap**
- [ ] **Step 6: Sync skill**
- [ ] **Step 7: Close issue #72**
