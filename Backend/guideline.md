# CollabHub — Developer Guidelines

> This file defines the **rules** every developer (and AI agent) must follow when working on this codebase.
> These conventions ensure consistency, predictability, and maintainability.

---

## 1. Naming Conventions

### Variables & Functions
| Type | Convention | Example |
|------|-----------|---------|
| Variables | `camelCase` | `teamId`, `authHeader`, `userRole` |
| Functions | `camelCase` | `sendMessage()`, `verifyToken()` |
| Controllers | `camelCase` + `Controller` suffix | `signupController`, `loginController` |
| Services | `camelCase`, descriptive verb | `authService.signup()`, `chatService.sendMessage()` |
| Socket handlers | `register` + PascalCase + `Handlers` | `registerChatHandlers`, `registerCallHandlers` |
| Async functions | Always `async function`, not arrow | `async function getMessages(...)` |

### Files & Folders
| Layer | Convention | Example |
|-------|-----------|---------|
| Routes folder | `lowercase` | `routes/v1/chat/` |
| Route file | `index.js` (always) | `routes/v1/chat/index.js` |
| Controller folder | `lowercase` | `controllers/v1/chat/` |
| Controller file | `<domain>.js` | `controllers/v1/chat/chat.js` |
| Controller index | `index.js` re-exports only | `controllers/v1/chat/index.js` |
| Service folder | `lowercase` | `service/v1/chat/` |
| Service file | `index.js` | `service/v1/chat/index.js` |
| Model folder | `PascalCase` | `models/TeamMember/` |
| Model file | `PascalCase.js` | `models/TeamMember/TeamMember.js` |
| Middleware folder | `lowercase-kebab` | `middleware/rate-limiter/` |
| Socket handler file | `<domain>.js` | `sockets/chat/chat.js` |

### Models (Sequelize)
- Model **class name**: `PascalCase` → `User`, `TeamMember`, `DirectMessage`
- Table **name**: `snake_case` plural → `users`, `team_members`, `direct_messages`
- Column **names**: `camelCase` in JS → `senderId`, `profilePic`, `isBlocked`
- **Primary keys**: always UUID (`DataTypes.UUIDV4`)
- **Timestamps**: always `timestamps: true` (createdAt, updatedAt auto-added)

### API Routes
- Base prefix: `/api/v1`
- Domain segment: `lowercase` → `/auth`, `/team`, `/chat`, `/direct`, `/notification`
- Resource actions: REST-style → `GET /chat/:teamId/messages`, `POST /chat/send`
- No trailing slashes

### Roles (Enum)
The system uses two canonical roles internally. Always use these constants:
```js
"SUPER_ADMIN"   // platform admin — maps from legacy "admin"
"MEMBER"        // regular user  — maps from legacy "user"
```
> Note: The DB `role` column still stores `"admin"` / `"user"` in some rows (legacy). The `verifyToken` middleware normalizes them to `SUPER_ADMIN` / `MEMBER` before setting `req.user`.

---

## 2. Restrictions (What You Must NOT Do)

### Architecture Restrictions
- ❌ **No business logic in controllers** — controllers only call a service and return `res.json()`
- ❌ **No Sequelize queries in controllers** — all DB access goes through `service/`
- ❌ **No business logic in `app.js` or `bin/www`** — these are only bootstrap files
- ❌ **No cross-domain service calls** — e.g., `chatService` must not call `authService` directly; use models
- ❌ **No new top-level routes** — all routes must be registered under `/api/v1` via `routes/v1/index.js`

### Socket Restrictions
- ❌ **No direct DB calls in socket handlers** — always delegate to a `service/` function
- ❌ **Never emit to `io.emit()` (all clients)** — always target a specific room (`io.to(roomId).emit(...)`)
- ❌ **No socket logic in `sockets/index.js`** — it only initializes and delegates to `registerXxxHandlers`

### Model Restrictions
- ❌ **Do not define associations inside the model file** — all associations go in `models/index.js` only
- ❌ **Do not use `DataTypes.INTEGER` for primary keys** — use `DataTypes.UUID` with `UUIDV4`
- ❌ **Do not use `sequelize.sync({ force: true })`** — only `sync()` without force in production code

### General Code Restrictions
- ❌ **No `var`** — use `const` or `let` only
- ❌ **No callbacks** — use `async/await` for all async operations
- ❌ **No `console.log` in service layer** — use only in entry points and socket connection logs
- ❌ **No hardcoded secrets or URLs** — always read from `process.env.*`
- ❌ **No new npm packages without justification** — check if existing libraries already cover the use case

---

## 3. Library Usage

### Approved Libraries & Their Intended Use

| Library | Purpose | Usage Scope |
|---------|---------|-------------|
| `express` (v5) | HTTP server and routing | `app.js`, `routes/` only |
| `sequelize` | ORM for PostgreSQL / MySQL | `models/`, `service/` only |
| `socket.io` | Real-time bidirectional events | `sockets/` only |
| `@socket.io/cluster-adapter` | Multi-worker socket sync | `bin/www` (setupPrimary), `sockets/index.js` (createAdapter) |
| `jsonwebtoken` | JWT sign/verify | `middleware/auth/auth.js`, `sockets/index.js` only |
| `bcryptjs` | Password hashing | `service/v1/auth/` only |
| `cloudinary` | Cloud image/file storage | `middleware/upload/` only |
| `multer` | Multipart form-data parsing | `middleware/upload/` only |
| `multer-storage-cloudinary` | Multer storage engine for Cloudinary | `middleware/upload/` only |
| `dotenv` | Environment variable loading | `app.js` and `bin/www` only (top of file) |
| `cors` | Cross-origin resource sharing | `app.js` only |
| `nanoid` | Short unique ID generation | `service/` layer when UUID is too long |
| `mysql2` / `pg` / `pg-hstore` | DB drivers for Sequelize | config only — never import directly |

### Rules for Library Usage
- **Do not import `sequelize` directly** in controllers or routes — always use model files from `models/index.js`
- **Do not import `jsonwebtoken` in service layer** — JWT logic belongs only in auth middleware and socket auth
- **Do not import `cloudinary` directly in controllers** — use the upload middleware
- **`dotenv`** must be called **once** at the very top of `app.js` or `bin/www`, never deep in the codebase
- **Adding a new library**: must have a clear, non-overlapping purpose with existing libraries

### What NOT to Add
- ❌ No `lodash` — use native JS array/object methods
- ❌ No `moment.js` — use native `Date` or `Intl`
- ❌ No additional HTTP client libraries (`axios`, `got`, etc.) — the backend does not consume external REST APIs in normal flow
- ❌ No ORM alternatives (e.g., Prisma, TypeORM) — Sequelize is the only ORM

---

## 4. Response Format Standard

All HTTP responses must follow this shape:

```js
// Success
res.status(200).json({
  success: true,
  message: "Human-readable message",
  data: { ... }       // omit if no data
});

// Error
res.status(4xx | 5xx).json({
  success: false,
  message: "Human-readable error"
});
```

- `success` field is always a boolean — **never omit it**
- `data` is omitted on error responses
- Status codes: `200` (ok), `201` (created), `400` (bad input), `401` (unauthenticated), `403` (forbidden), `404` (not found), `500` (server error)

---

## 5. Error Handling Pattern

```js
// In service — throw with statusCode
const err = new Error("Team not found");
err.statusCode = 404;
throw err;

// In controller — catch and respond
} catch (err) {
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Something went wrong"
  });
}

// In socket handler — emit to client
} catch (err) {
  socket.emit("errorMessage", { message: err.message || "Failed" });
}
```

---

## 6. Environment & Configuration Rules

- All config values come from `.env` via `process.env.*`
- Never commit `.env` — it is in `.gitignore`
- `.env.example` must be kept up to date whenever a new env variable is added
- `config/db.js` is the only place that reads database connection env vars

---

*Last updated: August 2026*
