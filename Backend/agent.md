# CollabHub — Backend Agent Guide

> **This file is for AI agents.** It contains the full project context — code structure, data flow, conventions, and patterns. Read this entire file before starting any task.

---

## 1. Project Overview

**CollabHub** is a real-time video collaboration platform where users can create teams, chat in channels, send direct messages, share files, and conduct WebRTC-based video/audio calls.

- **Backend**: Node.js + Express (v5) + Socket.io + Sequelize ORM
- **Database**: PostgreSQL (production) / MySQL (dev support)
- **File Storage**: Cloudinary (via multer-storage-cloudinary)
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Scaling**: Node.js Cluster mode with `@socket.io/cluster-adapter`
- **Frontend**: Vanilla HTML/CSS/JS (no framework) — `frontend/` folder

---

## 2. Project Root Structure

```
video_colla/
├── Backend/          ← Node.js Express server (main codebase)
│   ├── app.js        ← Express app setup, single-process entry point
│   ├── bin/www       ← Cluster entry point (use this in production)
│   ├── routes/       ← HTTP route definitions
│   ├── controllers/  ← Request handlers (thin layer)
│   ├── service/      ← Business logic (fat layer — all real work happens here)
│   ├── models/       ← Sequelize models + associations
│   ├── sockets/      ← Socket.io real-time event handlers
│   ├── middleware/   ← Auth, role, upload, rate-limiter, validator
│   ├── workflow/     ← Background jobs / scheduled tasks
│   ├── config/       ← DB config, migrator
│   ├── migrations/   ← Sequelize migration files
│   └── scripts/      ← One-off utility scripts
└── frontend/
    ├── index.html    ← Landing page
    ├── pages/        ← HTML pages (auth, admin, user)
    ├── css/          ← Stylesheets
    └── js/
        ├── config.js         ← API base URL, shared config
        └── pages/
            ├── auth/         ← Login/register JS
            ├── user/
            │   ├── dashboard.js  ← Main app logic (socket, call, chat UI)
            │   └── profile.js
            └── admin/        ← Admin panel JS
```

---

## 3. Backend Architecture

### 3.1 Entry Points

| Command | Entry File | Use Case |
|---------|-----------|----------|
| `npm start` | `bin/www` | Production — Cluster mode |
| `npm run dev` | `bin/www` via nodemon | Development — Cluster mode |
| `npm run start:single` | `app.js` | Debugging — Single process |

**`bin/www` — Cluster Mode (Default)**
- **Primary process**: DB init → `startWorkflows()` → `setupPrimary()` (Socket.io IPC bridge) → fork workers
- **Worker processes**: `createServer()` → `httpServer.listen(PORT)`
- **Auto-recovery**: `cluster.on('exit')` → `cluster.fork()` (self-healing — crashed workers are replaced automatically)

**`app.js` — Single Process**
- `initDatabase()` → `startWorkflows()` → `createServer()` → `listen(PORT)`

### 3.2 HTTP Request Flow

```
Client Request
    → CORS middleware
    → express.json()
    → /api/v1  →  routes/v1/index.js
                      → /auth         → routes/v1/auth/
                      → /user         → routes/v1/user/
                      → /team         → routes/v1/team/
                      → /chat         → routes/v1/chat/
                      → /direct       → routes/v1/direct/
                      → /notification → routes/v1/notification/
                      → /admin        → routes/v1/admin/
                               ↓
                    middleware (auth, role, validator, rate-limiter)
                               ↓
                    controllers/v1/<domain>/
                               ↓
                    service/v1/<domain>/   ← ACTUAL BUSINESS LOGIC
                               ↓
                    models/ (Sequelize queries)
```

> **Rule**: Controllers only handle `req`/`res`. All business logic must go in `service/`.

### 3.3 Real-Time Flow (Socket.io)

```
Client (browser) connects with JWT token in handshake auth
    → sockets/index.js
        → io.use() auth middleware
            JWT verify → socket.user = { userId, role }
            socket.join(`user:${userId}`)   ← personal room for targeted events
        ↓
    → registerChatHandlers(io, socket)   ← sockets/chat/chat.js
    → registerCallHandlers(io, socket)   ← sockets/call/call.js
```

**Chat Socket Events:**

| Client Emits | Server Action |
|---|---|
| `joinRoom(teamId)` | `socket.join(teamId)` — adds user to the team's room |
| `sendMessage({teamId, content, replyToId})` | Saves via chatService → `io.to(teamId).emit('newMessage', msg)` |
| `typing({teamId})` / `typing-start` | `socket.to(teamId).emit('userTyping', ...)` |
| `stopTyping({teamId})` / `typing-stop` | `socket.to(teamId).emit('userStoppedTyping', ...)` |

**Call Socket Events** — WebRTC signaling in `sockets/call/call.js`:
- WebRTC offer / answer / ICE candidate exchange
- Room-based call session management

---

## 4. Database Models & Associations

```
User ──< TeamMember >── Team
User ──< Message ──< MessageReaction
Team ──< Message
User ──< DirectMessage (as sender)
User ──< DirectMessage (as recipient)
User ──< Notification
```

**Models:**

| Model | Key Fields |
|-------|------------|
| `User` | id, name, email, password, role, avatar |
| `Team` | id, name, description, createdBy |
| `TeamMember` | userId, teamId, role |
| `Message` | id, teamId, senderId, content, replyToId |
| `MessageReaction` | messageId, userId, emoji |
| `DirectMessage` | senderId, recipientId, content |
| `Notification` | userId, type, data, read |

All associations are defined in `models/index.js`.

---

## 5. Middleware Stack

| Middleware | Location | Purpose |
|---|---|---|
| `authenticate` | `middleware/auth/` | Verifies JWT → sets `req.user` |
| `authorize(roles)` | `middleware/role/` | Role-based access control (admin / user) |
| `upload` | `middleware/upload/` | Multer + Cloudinary file upload handler |
| `rateLimiter` | `middleware/rate-limiter/` | API abuse prevention |
| `validator` | `middleware/validator/` | Request body validation |

---

## 6. Service Layer (Business Logic)

Every domain has its own service folder under `service/v1/`:

```
service/v1/
├── auth/         → register, login, token refresh
├── user/         → profile update, avatar upload
├── team/         → create, join, leave, member management
├── chat/         → sendMessage, getMessages, reactions
├── direct/       → DM send, fetch conversation
├── notification/ → create, mark-read, fetch
└── admin/        → user management, platform stats
```

All service functions are `async` and interact directly with Sequelize models.

---

## 7. Workflow (Background Jobs)

Background tasks live in `workflow/` and are started at server boot:

```
workflow/
├── index.js       → startWorkflows() — registers all background jobs
├── queue.js       → simple in-memory job queue
├── notification/  → notification delivery jobs
└── retryFailed/   → retry logic for failed operations
```

> `startWorkflows()` is called **only in the Primary/Master process** in cluster mode to avoid duplicate job execution.

---

## 8. Environment Variables

See `.env.example` for the full list. Key variables:

```env
PORT=5000
DATABASE_URL=postgresql://...    # or separate DB_HOST, DB_NAME, DB_USER, DB_PASS vars
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com    # This email is auto-promoted to admin role on startup
WORKERS=4                        # Number of cluster workers (default: CPU core count)
```

---

## 9. Frontend Overview

Pure Vanilla JS — no build step, no framework, no bundler.

```
frontend/
├── index.html              ← Landing page
├── pages/
│   ├── auth/               ← login.html, register.html
│   ├── user/
│   │   ├── dashboard.html  ← Main app (teams, chat, calls)
│   │   └── profile.html
│   └── admin/              ← Admin panel
├── css/                    ← Stylesheets
└── js/
    ├── config.js           ← API_BASE_URL, shared constants
    └── pages/
        ├── auth/           ← login.js, register.js
        ├── user/
        │   ├── dashboard.js   ← ~2000+ lines — all socket, chat, call, team UI logic
        │   └── profile.js
        └── admin/
```

`dashboard.js` is the largest and most critical frontend file. It handles:
- Socket.io client connection and event handling
- Chat UI rendering (messages, reactions, replies)
- WebRTC call management (offer/answer/ICE)
- Team management UI
- All DOM event listeners for the main app

---

## 10. Coding Conventions & Rules

### Do's
- **All business logic goes in `service/`** — keep controllers thin (only req/res)
- **Follow the domain folder pattern** — `routes/v1/chat/`, `controllers/v1/chat/`, `service/v1/chat/`
- **Keep socket handlers in separate files** — `sockets/chat/chat.js`, `sockets/call/call.js`
- **Use `async/await`** — avoid callbacks
- **Socket rooms**: team chat → `String(teamId)`, personal events → `user:${userId}`
- **Error handling**: throw errors from service, catch in socket handler and emit `socket.emit('errorMessage', { message })`

### Don'ts
- Do not write Sequelize queries inside controllers
- Do not put business logic directly in `app.js`
- Do not put business logic in `bin/www` — it is only for cluster setup
- Avoid inline HTML string concatenation in frontend — use template functions

### File Naming Conventions
- Routes: `routes/v1/<domain>/index.js`
- Controllers: `controllers/v1/<domain>/index.js` or `controllers/v1/<domain>/<action>.js`
- Services: `service/v1/<domain>/index.js`
- Models: `models/<ModelName>/<ModelName>.js`

---

## 11. How to Add a New Feature

1. **Model** (if new table needed): create `models/<Name>/<Name>.js` → add associations in `models/index.js`
2. **Migration**: add a migration file in `migrations/`
3. **Service**: write business logic in `service/v1/<domain>/`
4. **Controller**: write `req/res` handler in `controllers/v1/<domain>/`
5. **Route**: define route in `routes/v1/<domain>/` → register it in `routes/v1/index.js`
6. **Socket** (for real-time features): add handler in `sockets/<domain>/` → register in `sockets/index.js`
7. **Frontend**: update `frontend/js/pages/user/dashboard.js` or create a new page file

---

## 12. Future Updates

> **Note for agent**: When the owner adds a new feature or describes upcoming changes, document them here. Do not modify other sections.

### Planned / In Progress
<!-- Add upcoming features here -->

### Recently Added
<!-- Track latest changes here -->

### Known Issues / TODOs
<!-- List pending bugs and TODOs here -->

---

*Last updated: August 2026*
