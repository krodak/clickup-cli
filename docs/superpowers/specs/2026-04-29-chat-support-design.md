# Chat Support Design Spec

## Goal

Add full ClickUp Chat support to `cup` — channel management, messaging, replies, and reactions. This is a new feature area using the v3 Chat API (19 endpoints).

## API Surface (v3)

### Channel Management (9 endpoints)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/chat/channels` | List channels (filters: is_follower, include_closed, channel_types) |
| POST | `/chat/channels` | Create a channel (name, visibility, topic, user_ids) |
| POST | `/chat/channels/direct_message` | Create DM (user_ids, max 15) |
| POST | `/chat/channels/location` | Create channel on a space/folder/list |
| GET | `/chat/channels/{id}` | Get channel details |
| PATCH | `/chat/channels/{id}` | Update channel (name, description, topic, visibility) |
| DELETE | `/chat/channels/{id}` | Delete channel |
| GET | `/chat/channels/{id}/followers` | List followers |
| GET | `/chat/channels/{id}/members` | List members |

### Messaging (4 endpoints)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/chat/channels/{id}/messages` | List messages (paginated, markdown/plain) |
| POST | `/chat/channels/{id}/messages` | Send message (type: message\|post, content, markdown) |
| PATCH | `/chat/messages/{id}` | Update message |
| DELETE | `/chat/messages/{id}` | Delete message |

### Replies (2 endpoints)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/chat/messages/{id}/replies` | List replies (paginated) |
| POST | `/chat/messages/{id}/replies` | Reply to message |

### Reactions (3 endpoints)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/chat/messages/{id}/reactions` | List reactions |
| POST | `/chat/messages/{id}/reactions` | Add reaction (emoji name) |
| DELETE | `/chat/messages/{id}/reactions/{reaction}` | Remove reaction |

### Tagged Users (1 endpoint)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/chat/messages/{id}/tagged_users` | List tagged users |

## Key API Details

- All endpoints use v3: `api.clickup.com/api/v3/workspaces/{workspace_id}/chat/...`
- Messages support `content_format: text/md | text/plain` (default: markdown)
- Message types: `message` (regular) and `post` (titled post with subtype)
- Content max length: 40,000 characters
- Channel types: `CHANNEL`, `DM`, `GROUP_DM`
- Channel visibility: `PUBLIC`, `PRIVATE`
- Location channels can be scoped to a `space`, `folder`, or `list`
- Pagination is cursor-based with `limit` (max 100, default 50)

## CLI Command Design

### Approach: `chat` subcommand group

Following the existing pattern (`checklist`, `filter`, `favorite`, `bulk`), create a `chat` subcommand group with nested commands.

### Command Inventory

#### Channel discovery and management
```bash
cup chat channels                                  # list channels (you follow)
cup chat channels --all                            # list all channels (including ones you don't follow)
cup chat channels --type dm                        # filter by type (channel, dm, group_dm)
cup chat channel <channelId>                       # get channel details
cup chat channel-create <name>                     # create public channel
cup chat channel-create <name> --private           # create private channel
cup chat channel-create <name> --space <id>        # create on a space
cup chat dm <userId>                               # create or open a DM
cup chat dm <userId1>,<userId2>                    # group DM (up to 15)
cup chat channel-update <id> --name <name>         # rename channel
cup chat channel-update <id> --topic <topic>       # set topic
cup chat channel-delete <id>                       # delete channel (destructive)
cup chat members <channelId>                       # list channel members
cup chat followers <channelId>                     # list channel followers
```

#### Messaging
```bash
cup chat send <channelId> -m "message"             # send message (markdown)
cup chat send <channelId> -m "message" --post --title "Title"  # send as post
cup chat messages <channelId>                      # list recent messages
cup chat messages <channelId> --limit 20           # paginate
cup chat message-update <messageId> -m "new text"  # edit message
cup chat message-delete <messageId>                # delete message
```

#### Replies
```bash
cup chat reply <messageId> -m "reply text"         # reply to message
cup chat replies <messageId>                       # list replies
```

#### Reactions
```bash
cup chat react <messageId> --emoji "thumbsup"      # add reaction
cup chat unreact <messageId> --emoji "thumbsup"    # remove reaction
cup chat reactions <messageId>                     # list reactions
```

### Command count: 18 (matches the 19 API endpoints minus tagged_users which is low-value)

## Architecture

### Files
```
src/commands/chat.ts              # Channel CRUD, message formatting
src/commands/chat-message.ts      # Send, update, delete, list messages
src/commands/chat-reply.ts        # Replies
src/commands/chat-reaction.ts     # Reactions
tests/unit/commands/chat.test.ts
tests/unit/commands/chat-message.test.ts
tests/unit/commands/chat-reply.test.ts
tests/unit/commands/chat-reaction.test.ts
tests/e2e/chat.e2e.ts            # E2E: create channel, send message, reply, react, cleanup
```

### API Client additions (`src/api.ts`)
```typescript
// Channel management
getChatChannels(opts?): Promise<ChatChannel[]>
getChatChannel(channelId): Promise<ChatChannel>
createChatChannel(name, opts?): Promise<ChatChannel>
createDirectMessage(userIds): Promise<ChatChannel>
createLocationChannel(location, opts?): Promise<ChatChannel>
updateChatChannel(channelId, opts): Promise<ChatChannel>
deleteChatChannel(channelId): Promise<void>
getChatChannelMembers(channelId): Promise<ChatMember[]>
getChatChannelFollowers(channelId): Promise<ChatFollower[]>

// Messaging
getChatMessages(channelId, opts?): Promise<ChatMessage[]>
sendChatMessage(channelId, content, opts?): Promise<ChatMessage>
updateChatMessage(messageId, content, opts?): Promise<ChatMessage>
deleteChatMessage(messageId): Promise<void>

// Replies
getChatMessageReplies(messageId, opts?): Promise<ChatMessage[]>
createChatMessageReply(messageId, content, opts?): Promise<ChatMessage>

// Reactions
getChatMessageReactions(messageId): Promise<ChatReaction[]>
createChatMessageReaction(messageId, emoji): Promise<ChatReaction>
deleteChatMessageReaction(messageId, emoji): Promise<void>
```

All v3 endpoints use `requestV3` / `requestV3Array` (already exist in api.ts from docs work).

### Message formatting
- Reuse the existing `markdownToCommentBlocks` converter? No — Chat API uses `content_format: text/md` directly (accepts raw markdown string, not blocks). Simpler than task comments.
- Messages support markdown natively via the `content` field + `content_format: text/md`

### Output formatting
- TTY: colored table for channel list, formatted messages with author/date/content
- Piped: markdown
- JSON: raw API response

## Phased Delivery

### Phase 1: MVP (channels + send + read)
- `cup chat channels` (list)
- `cup chat channel <id>` (details)
- `cup chat send <channelId> -m "text"` (send)
- `cup chat messages <channelId>` (read)
- API client: 4 methods
- Tests: unit + basic e2e
- **Estimated: 1 task**

### Phase 2: Channel management
- `cup chat channel-create`, `cup chat dm`, `cup chat channel-update`, `cup chat channel-delete`
- `cup chat members`, `cup chat followers`
- **Estimated: 1 task**

### Phase 3: Replies + reactions
- `cup chat reply`, `cup chat replies`
- `cup chat react`, `cup chat unreact`, `cup chat reactions`
- `cup chat message-update`, `cup chat message-delete`
- **Estimated: 1 task**

### Phase 4: Docs, metadata, completions, e2e
- Update SKILL.md, README, commands.md, api-coverage.md
- Add to metadata.ts, completion.ts
- Full e2e test suite
- **Estimated: 1 task**

## Decisions

1. **`chat` subcommand group** — not top-level commands. Keeps the namespace clean and groups related functionality.
2. **Chat messages use raw markdown** — not the Quill Delta block format used by task comments. The Chat API accepts `content_format: text/md` natively.
3. **Skip tagged_users endpoint** — low value for CLI users. Can add later if requested.
4. **Channel name resolution** — like `--space`, accept channel names with fuzzy matching when listing messages (requires fetching channels first). For MVP, require channel IDs.
5. **DM shorthand** — `cup chat dm <userId>` creates or opens existing DM (API returns existing if already exists, per the 200 vs 201 response codes).
6. **Destructive operations** — `cup chat channel-delete` and `cup chat message-delete` require `--confirm` in non-TTY mode, matching existing `cup delete` pattern.
