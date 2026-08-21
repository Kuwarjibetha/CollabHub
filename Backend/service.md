\# CollabHub — Service & API Reference

> Complete reference for all internal service functions and external API integrations.
> Keep this file updated whenever a service function is added, modified, or removed.

---

## Table of Contents

1. [Internal Services](#1-internal-services)
   - [Auth Service](#11-auth-service)
   - [User Service](#12-user-service)
   - [Team Service](#13-team-service)
   - [Chat Service](#14-chat-service)
   - [Direct Message Service](#15-direct-message-service)
   - [Notification Service](#16-notification-service)
   - [Admin Service](#17-admin-service)
2. [Real-Time Socket Services (Call)](#2-real-time-socket-services-call)
3. [External APIs](#3-external-apis)
   - [Cloudinary](#31-cloudinary)
   - [JWT](#32-jwt-jsonwebtoken)
4. [Workflow / Background Jobs](#4-workflow--background-jobs)

---

## 1. Internal Services

All services live in `service/v1/<domain>/`. They are the **only** place where business logic and database access should happen.

---

### 1.1 Auth Service

**File**: `service/v1/auth/auth.js`  
**Import**: `const authService = require('../service/v1/auth')`

| Function | Signature | Returns | Description |
|----------|-----------|---------|-------------|
| `signup` | `({ name, email, password })` | User object (no password) | Checks for duplicate email, hashes password with bcrypt (salt 10), creates User row |
| `login` | `({ email, password })` | `{ user, token }` | Verifies credentials, signs JWT (expires 7d) with `{ userId, role }` payload |

**Error codes thrown:**
- `409` — Email already registered (signup)
- `401` — Invalid email or password (login)

**JWT payload shape:**
```js
{ userId: string (UUID), role: "MEMBER" | "SUPER_ADMIN" }
```

---

### 1.2 User Service

**File**: `service/v1/user/user.js`  
**Import**: `const userService = require('../service/v1/user')`

| Function | Signature | Returns | Description |
|----------|-----------|---------|-------------|
| `getProfile` | `(userId)` | User object (no password) | Fetches user by primary key |
| `updateProfile` | `(userId, { name, profilePic })` | Updated user object | Updates name and/or profilePic URL. `profilePic` is a Cloudinary URL, set by upload middleware before calling this |
| `changePassword` | `(userId, { oldPassword, newPassword })` | `{ message }` | Verifies old password with bcrypt, hashes and saves new password |

**Error codes thrown:**
- `404` — User not found
- `401` — Old password is incorrect

---

### 1.3 Team Service

**File**: `service/v1/team/team.js`  
**Import**: `const teamService = require('../service/v1/team')`

| Function | Signature | Returns | Description |
|----------|-----------|---------|-------------|
| `createTeam` | `(userId, { name })` | Team object | Creates team + adds creator as `TEAM_ADMIN`. Generates 8-char `inviteCode` via `nanoid`. Wrapped in Sequelize transaction |
| `joinTeam` | `(userId, { inviteCode })` | Team object | Flexible case-insensitive invite code lookup. Adds user as `MEMBER` |
| `getMyTeams` | `(userId)` | Array of teams + `myRole` field | Returns all teams the user belongs to, with computed `myRole: "TEAM_ADMIN" | "MEMBER"` |
| `leaveTeam` | `(userId, teamId)` | `{ message }` | If last member → deletes team. If owner leaves → reassigns ownership to next member. Transactional |
| `getTeamMembers` | `(userId, teamId)` | Array of TeamMember + User | Membership check first, then returns all members with user info |
| `updateMemberRole` | `(requesterId, teamId, memberId, role)` | Updated TeamMember | Requires requester to be team admin. Accepts `"TEAM_ADMIN"` or `"MEMBER"` |
| `removeMember` | `(requesterId, teamId, memberId)` | `{ message }` | Requires requester to be team admin. Cannot remove self |
| `deleteTeamByOwner` | `(userId, teamId)` | `{ message }` | Cascades: deletes MessageReactions → Messages → TeamMembers → Team. Transactional |

**Error codes thrown:**
- `400` — Missing invite code / already a member / self-removal
- `403` — Not a team admin
- `404` — Team/member not found

**Important note**: `inviteCode` lookup is flexible — matches exact, with `-` prefix, `_` prefix, and case-insensitive variants. This handles nanoid codes that start with `-` or `_`.

---

### 1.4 Chat Service

**File**: `service/v1/chat/chat.js`  
**Import**: `const chatService = require('../service/v1/chat')`

| Function | Signature | Returns | Description |
|----------|-----------|---------|-------------|
| `sendMessage` | `(userId, { teamId, content, replyToId, fileUrl, fileType, fileName })` | Full message with sender | Verifies membership, creates message, detects `@mentions` → creates Notification rows, commits transaction, then enqueues background notification job |
| `getChatHistory` | `(userId, teamId, { limit=50, offset=0 })` | Array of messages (oldest first) | Paginates messages with sender + reactions. Returns reversed (ASC order) |
| `toggleReaction` | `(userId, messageId, emoji)` | `{ messageId, teamId, reactions[] }` | Adds or removes emoji reaction (toggle). Returns full updated reactions array |
| `markTeamRead` | `(userId, teamId)` | Updated TeamMember | Sets `lastReadAt = now()` on the membership row |
| `getUnreadCounts` | `(userId)` | `[{ teamId, count }]` | Returns unread message count per team based on `lastReadAt` |
| `editMessage` | `(userId, messageId, { content })` | Updated message | Only sender can edit. Sets `isEdited = true` |
| `deleteMessage` | `(userId, messageId)` | `{ message }` | Soft delete — sets `isDeleted = true`, replaces content with "This message was deleted" |

**sendMessage transaction flow:**
```
BEGIN TRANSACTION
  → Message.create(...)
  → Message.findByPk(id, { include: sender })
  → If @mention detected: Notification.bulkCreate(mentioned users)
COMMIT
→ enqueueNotificationJob(...)   ← runs AFTER commit (background)
```

**Error codes thrown:**
- `400` — No content and no file
- `403` — Not a team member / not message owner
- `404` — Message not found

---

### 1.5 Direct Message Service

**File**: `service/v1/direct/direct.js`  
**Import**: `const directService = require('../service/v1/direct')`

| Function | Signature | Returns | Description |
|----------|-----------|---------|-------------|
| `sendDirectMessage` | `(senderId, recipientId, content)` | Full DM with sender info | Validates recipient exists, creates DirectMessage row, returns with sender join |
| `getConversation` | `(userId, otherUserId, { limit=50, offset=0 })` | Array of DMs (oldest first) | Fetches both directions of conversation, auto-marks received messages as `isRead = true`, returns reversed |
| `getContacts` | `(userId)` | Array of User objects | Finds all unique users the current user has exchanged DMs with |

**Error codes thrown:**
- `400` — Empty message content
- `404` — Recipient not found

---

### 1.6 Notification Service

**File**: `service/v1/notification/notification.js`  
**Import**: `const notificationService = require('../service/v1/notification')`

| Function | Signature | Returns | Description |
|----------|-----------|---------|-------------|
| `createNotificationForTeam` | `({ teamId, excludeUserId, type, title, content, relatedId })` | Array of Notification rows | Creates a notification for every team member except `excludeUserId`. Called by the workflow background job |
| `getMyNotifications` | `(userId)` | Array (max 50, newest first) | Fetches all notifications for a user |
| `markAsRead` | `(userId, notificationId)` | Updated Notification | Marks single notification as read. Verifies ownership |
| `markAllAsRead` | `(userId)` | `{ message }` | Bulk update — marks all unread notifications as read |

**Notification `type` values:**
| Type | When created |
|------|-------------|
| `"message"` | New team message (background job) |
| `"mention"` | User `@mentioned` in a message (inline in sendMessage) |
| `"call"` | Team call started (call socket handler) |

---

### 1.7 Admin Service

**File**: `service/v1/admin/admin.js`  
**Import**: `const adminService = require('../service/v1/admin')`  
**Access**: `SUPER_ADMIN` role only (enforced by role middleware on routes)

| Function | Signature | Returns | Description |
|----------|-----------|---------|-------------|
| `getAllUsers` | `({ search? })` | Array of users | Optional name/email search. Returns id, name, email, role, isBlocked |
| `toggleUserBlock` | `(userId, isBlocked?)` | Updated User | Blocks/unblocks user. If `isBlocked` param omitted, toggles current state |
| `deleteUser` | `(userId)` | `{ message }` | Cascade deletes: Notifications → TeamMemberships → MessageReactions → User. Transactional |
| `getAllTeams` | `()` | Array of teams with members | All teams with nested TeamMember rows |
| `deleteTeam` | `(teamId)` | `{ message }` | Cascade: MessageReactions → Messages → TeamMembers → Team. Transactional |
| `deleteAnyMessage` | `(messageId)` | `{ message }` | Admin soft-delete — sets content to "This message was removed by admin" |
| `getAnalytics` | `()` | Analytics object | Returns `totalUsers`, `totalTeams`, `totalMessages`, `activeUsersToday` (distinct senders in last 24h) |
| `getAllMessages` | `({ limit=100, offset=0 })` | Array of messages | With sender + team info. Max 200 per request |
| `broadcast` | `({ title, content })` | Array of Notifications | Creates a notification for every non-blocked user. Transactional |

---

## 2. Real-Time Socket Services (Call)

**File**: `sockets/call/call.js`  
WebRTC signaling — no external API, pure Socket.io room-based signaling.

**In-memory state** (resets on server restart):
```js
activeCalls: Map<teamId, Set<socketId>>   // tracks who is in each call room
socketToUser: Map<socketId, userId>        // maps socket → user for deduplication
```

### Call Socket Events

| Client Emits | Payload | Server Does |
|---|---|---|
| `get-active-calls` | — | Emits `active-calls-list: { liveTeamIds[] }` to caller |
| `joinCall` | `{ teamId }` | Validates membership, joins `call-{teamId}` room, emits `callParticipants` to joiner, emits `userJoinedCall` + `meeting-status-changed` to team |
| `call-start` | `{ teamId, teamName, callerName }` | Emits `team-call-started` + `meeting-status-changed` to all team members. Creates Notification DB rows. Emits real-time `notification` to each member's personal room |
| `offer` | `{ to: socketId, offer }` | Forwards WebRTC offer to target socket |
| `answer` | `{ to: socketId, answer }` | Forwards WebRTC answer to target socket |
| `ice-candidate` | `{ to: socketId, candidate }` | Forwards ICE candidate to target socket |
| `leaveCall` | `{ teamId }` | Removes from room + activeCalls map. Emits `userLeftCall` to room. If last person → emits `meeting-status-changed` with `isLive: false` |

| Server Emits | When |
|---|---|
| `callParticipants` | Sent to a newly joining user — list of existing participants |
| `userJoinedCall` | Broadcast to call room when someone joins |
| `userLeftCall` | Broadcast to call room when someone leaves |
| `team-call-started` | Sent to all team members when call begins |
| `meeting-status-changed` | Sent to all team members on join/leave (carries `isLive`, `participantCount`) |
| `call-ended-by-new-tab` | Sent to a user's old socket if they join from a new tab |
| `active-calls-list` | Response to `get-active-calls` |

**Auto-replace logic**: If a user joins a call from a second tab/window, their old socket is cleanly evicted and other peers are told to close that stale peer connection.

---

## 3. External APIs

### 3.1 Cloudinary

**Purpose**: Cloud storage for user profile pictures and chat file uploads.  
**Config file**: `config/cloudinary.js`  
**Used in**: `middleware/upload/upload.js` and `middleware/upload/chatUpload.js`

#### Profile Picture Upload (`middleware/upload/upload.js`)

| Setting | Value |
|---------|-------|
| Cloudinary folder | `team-collab/profile-pics` |
| Allowed formats | `jpg`, `png`, `webp` |
| Transformation | Crop to 300×300 (fill) |
| Max file size | **5 MB** |
| Field name (multer) | `profilePic` |

#### Chat File Upload (`middleware/upload/chatUpload.js`)

| Setting | Value |
|---------|-------|
| Cloudinary folder | `team-collab/chat-files` |
| Allowed formats | `jpg`, `png`, `webp`, `mp4`, `mov`, `pdf`, `docx`, `xlsx`, `zip` |
| Resource type | `auto` (Cloudinary auto-detects image/video/raw) |
| Max file size | **20 MB** |

**How it works in a request:**
```
POST /api/v1/user/profile
  → upload.single('profilePic') middleware runs
  → Multer streams file to Cloudinary
  → req.file.path = Cloudinary URL
  → Controller reads req.file.path and passes to userService.updateProfile()
```

**Environment variables required:**
```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

### 3.2 JWT (jsonwebtoken)

**Purpose**: Stateless authentication tokens.  
**Used in**: `service/v1/auth/auth.js` (sign), `middleware/auth/auth.js` (verify), `sockets/index.js` (verify)

| Setting | Value |
|---------|-------|
| Algorithm | HS256 (default) |
| Expiry | 7 days |
| Secret env var | `JWT_SECRET` |

**Token payload:**
```js
{ userId: "uuid", role: "MEMBER" | "SUPER_ADMIN" | "admin" | "user" }
```

**Where token is sent:**
- HTTP: `Authorization: Bearer <token>` header
- Socket.io: `socket.handshake.auth.token`

**Role normalization** (done in `middleware/auth/auth.js`):
```
"admin" → "SUPER_ADMIN"
"user"  → "MEMBER"
```

---

## 4. Workflow / Background Jobs

**File**: `workflow/index.js`  
**Started by**: `startWorkflows()` in Primary cluster process only.

### Notification Worker

**File**: `workflow/notification/`  
**Trigger**: `enqueueNotificationJob(payload)` called from `chatService.sendMessage()` after commit.

```js
enqueueNotificationJob({
  teamId,
  excludeUserId,   // message sender — do not notify them
  type,            // "message"
  title,
  content,         // first 50 chars of message
  relatedId,       // teamId
})
```

**What it does**: Dequeues jobs from the in-memory queue and calls `notificationService.createNotificationForTeam()` asynchronously, decoupling notification creation from the message send response.

### Retry Worker

**File**: `workflow/retryFailed/`  
**Purpose**: Retries failed notification jobs that were not processed successfully on first attempt.

---

## 5. HTTP API Endpoints Summary

> All paths and methods verified directly against route files in `routes/v1/`.

| Method | Path | Service Function | Auth |
|--------|------|-----------------|------|
| `POST` | `/api/v1/auth/signup` | `authService.signup` | None |
| `POST` | `/api/v1/auth/login` | `authService.login` | None |
| `GET` | `/api/v1/user/me` | `userService.getProfile` | JWT |
| `PATCH` | `/api/v1/user/me` | `userService.updateProfile` | JWT |
| `PATCH` | `/api/v1/user/change-password` | `userService.changePassword` | JWT |
| `POST` | `/api/v1/user/profile-pic` | upload middleware → `userService.updateProfile` | JWT |
| `POST` | `/api/v1/team/create` | `teamService.createTeam` | JWT |
| `POST` | `/api/v1/team/join` | `teamService.joinTeam` | JWT |
| `GET` | `/api/v1/team/my-teams` | `teamService.getMyTeams` | JWT |
| `GET` | `/api/v1/team/:teamId/members` | `teamService.getTeamMembers` | JWT |
| `DELETE` | `/api/v1/team/:teamId/leave` | `teamService.leaveTeam` | JWT |
| `PATCH` | `/api/v1/team/:teamId/members/:userId` | `teamService.updateMemberRole` | JWT + TEAM_ADMIN |
| `DELETE` | `/api/v1/team/:teamId/members/:userId` | `teamService.removeMember` | JWT + TEAM_ADMIN |
| `DELETE` | `/api/v1/team/:teamId` | `teamService.deleteTeamByOwner` | JWT + TEAM_ADMIN |
| `POST` | `/api/v1/chat/send` | `chatService.sendMessage` | JWT |
| `POST` | `/api/v1/chat/send-file` | `chatService.sendMessage` (file) | JWT |
| `GET` | `/api/v1/chat/:teamId/history` | `chatService.getChatHistory` | JWT |
| `GET` | `/api/v1/chat/unread/counts` | `chatService.getUnreadCounts` | JWT |
| `PATCH` | `/api/v1/chat/:teamId/read` | `chatService.markTeamRead` | JWT |
| `PATCH` | `/api/v1/chat/:messageId` | `chatService.editMessage` | JWT |
| `DELETE` | `/api/v1/chat/:messageId` | `chatService.deleteMessage` | JWT |
| `POST` | `/api/v1/chat/:messageId/reactions` | `chatService.toggleReaction` | JWT |
| `GET` | `/api/v1/direct/contacts` | `directService.getContacts` | JWT |
| `GET` | `/api/v1/direct/:userId` | `directService.getConversation` | JWT |
| `POST` | `/api/v1/direct/send` | `directService.sendDirectMessage` | JWT |
| `GET` | `/api/v1/notification` | `notificationService.getMyNotifications` | JWT |
| `PATCH` | `/api/v1/notification/:notificationId/read` | `notificationService.markAsRead` | JWT |
| `PATCH` | `/api/v1/notification/read-all` | `notificationService.markAllAsRead` | JWT |
| `GET` | `/api/v1/admin/users` | `adminService.getAllUsers` | JWT + SUPER_ADMIN |
| `PATCH` | `/api/v1/admin/users/:userId/block` | `adminService.toggleUserBlock` | JWT + SUPER_ADMIN |
| `DELETE` | `/api/v1/admin/users/:userId` | `adminService.deleteUser` | JWT + SUPER_ADMIN |
| `GET` | `/api/v1/admin/teams` | `adminService.getAllTeams` | JWT + SUPER_ADMIN |
| `DELETE` | `/api/v1/admin/teams/:teamId` | `adminService.deleteTeam` | JWT + SUPER_ADMIN |
| `DELETE` | `/api/v1/admin/messages/:messageId` | `adminService.deleteAnyMessage` | JWT + SUPER_ADMIN |
| `GET` | `/api/v1/admin/messages` | `adminService.getAllMessages` | JWT + SUPER_ADMIN |
| `GET` | `/api/v1/admin/analytics` | `adminService.getAnalytics` | JWT + SUPER_ADMIN |
| `POST` | `/api/v1/admin/broadcast` | `adminService.broadcast` | JWT + SUPER_ADMIN |
| `GET` | `/` | health check | None |

---

*Last updated: August 2026*
