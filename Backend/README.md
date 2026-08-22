# CollabHub — Backend API

> Real-time collaboration platform backend — REST API + Socket.io + WebRTC signaling built with Node.js, Express, and PostgreSQL.

---

## 🚀 Features

- 🔐 **JWT Authentication** — Signup, Login, role-based access
- 👥 **Team Management** — Create teams, invite via code, manage members
- 💬 **Real-time Team Chat** — Socket.io powered messaging with reactions, replies, file sharing
- 📩 **Direct Messages** — Private 1-on-1 conversations
- 📁 **File Uploads** — Images, videos, documents via Cloudinary
- 🔔 **Notifications** — In-app notifications with background job queue
- 📹 **Video/Audio Call Signaling** — WebRTC offer/answer/ICE relay
- 🖥️ **Screen Share Support** — Via WebRTC track replacement
- 🛡️ **Admin Panel API** — User management, moderation, analytics, broadcast
- ⚡ **Cluster Mode** — Multi-core Node.js clustering with Socket.io adapter for horizontal scaling
- 🔄 **Auto-Recovery** — Crashed workers are automatically replaced

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| Node.js + Express v5 | HTTP server and routing |
| Socket.io v4 | Real-time bidirectional events |
| Sequelize ORM | Database abstraction layer |
| PostgreSQL | Primary database |
| Cloudinary | Cloud file & image storage |
| JWT (jsonwebtoken) | Stateless authentication |
| bcryptjs | Password hashing |
| nanoid | Short unique invite code generation |
| `@socket.io/cluster-adapter` | Multi-worker socket sync via IPC |

---

## 📁 Project Structure

```
Backend/
├── app.js              # Express app setup (single-process entry)
├── bin/www             # Cluster entry point (production)
├── routes/v1/          # HTTP route definitions (auth, user, team, chat, direct, notification, admin)
├── controllers/v1/     # Request/response handlers (thin layer)
├── service/v1/         # Business logic (all DB operations live here)
├── models/             # Sequelize models + associations
│   ├── User/
│   ├── Team/
│   ├── TeamMember/
│   ├── Message/
│   ├── MessageReaction/
│   ├── DirectMessage/
│   └── Notification/
├── sockets/
│   ├── index.js        # Socket.io init + JWT auth middleware
│   ├── chat/           # Chat event handlers
│   └── call/           # WebRTC signaling handlers
├── middleware/
│   ├── auth/           # JWT verify middleware
│   ├── role/           # Role-based access (SUPER_ADMIN, TEAM_ADMIN)
│   ├── upload/         # Multer + Cloudinary upload
│   ├── rate-limiter/   # API rate limiting
│   └── validator/      # Request validation
├── workflow/           # Background notification job queue
├── config/             # DB config, Cloudinary config, migrator
├── migrations/         # Sequelize migration files
└── scripts/            # One-off utility scripts
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL database (local or Supabase/Railway)
- Cloudinary account

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Kuwarjibetha/CollabHub.git
cd CollabHub/Backend

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your actual values (see Environment Variables section below)

# 4. Start development server
npm run dev
```

---

## 🔑 Environment Variables

Create a `.env` file in the `Backend/` directory:

```env
PORT=5000

# Database (PostgreSQL)
DATABASE_URL=                        # Full connection string (optional if using below vars)
DB_NAME=postgres
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=5432

# Auth
JWT_SECRET=your_super_secret_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# App
FRONTEND_URL=http://127.0.0.1:5500
```

---

## 📜 NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Production (cluster) | `npm start` | Runs `bin/www` — multi-core cluster mode |
| Development (cluster) | `npm run dev` | nodemon + cluster mode |
| Single process | `npm run start:single` | Runs `app.js` — for debugging |

> **Recommended**: Always use `npm run dev` or `npm start`. Single process mode is only for debugging.

---

## 🌐 API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/signup` | ❌ | Register a new user |
| `POST` | `/auth/login` | ❌ | Login and get JWT token |

### User
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/user/me` | ✅ | Get own profile |
| `PATCH` | `/user/me` | ✅ | Update name / profilePic |
| `PATCH` | `/user/change-password` | ✅ | Change password |
| `POST` | `/user/profile-pic` | ✅ | Upload profile picture (multipart) |

### Teams
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/team/create` | ✅ | Create a new team |
| `POST` | `/team/join` | ✅ | Join team via invite code |
| `GET` | `/team/my-teams` | ✅ | List all teams user belongs to |
| `GET` | `/team/:teamId/members` | ✅ | Get team members |
| `DELETE` | `/team/:teamId/leave` | ✅ | Leave team |
| `PATCH` | `/team/:teamId/members/:userId` | ✅ Team Admin | Update member role |
| `DELETE` | `/team/:teamId/members/:userId` | ✅ Team Admin | Remove member |
| `DELETE` | `/team/:teamId` | ✅ Team Admin | Delete team |

### Chat
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/chat/send` | ✅ | Send text message |
| `POST` | `/chat/send-file` | ✅ | Send file message (multipart) |
| `GET` | `/chat/:teamId/history` | ✅ | Fetch chat history |
| `GET` | `/chat/unread/counts` | ✅ | Get unread message counts per team |
| `PATCH` | `/chat/:teamId/read` | ✅ | Mark team messages as read |
| `PATCH` | `/chat/:messageId` | ✅ | Edit own message |
| `DELETE` | `/chat/:messageId` | ✅ | Soft delete own message |
| `POST` | `/chat/:messageId/reactions` | ✅ | Toggle emoji reaction |

### Direct Messages
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/direct/send` | ✅ | Send a DM |
| `GET` | `/direct/:userId` | ✅ | Get conversation with a user |
| `GET` | `/direct/contacts` | ✅ | Get all DM contacts |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/notification` | ✅ | Get own notifications |
| `PATCH` | `/notification/:notificationId/read` | ✅ | Mark one as read |
| `PATCH` | `/notification/read-all` | ✅ | Mark all as read |

### Admin (SUPER_ADMIN only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/users` | List all users (search supported) |
| `PATCH` | `/admin/users/:userId/block` | Block / unblock user |
| `DELETE` | `/admin/users/:userId` | Delete user |
| `GET` | `/admin/teams` | List all teams |
| `DELETE` | `/admin/teams/:teamId` | Delete any team |
| `GET` | `/admin/messages` | Get all messages |
| `DELETE` | `/admin/messages/:messageId` | Remove any message |
| `GET` | `/admin/analytics` | Platform stats |
| `POST` | `/admin/broadcast` | Broadcast notification to all users |

---

## 🔌 Socket Events

Connect with:
```js
const socket = io(SOCKET_URL, { auth: { token: "Bearer <jwt>" } });
```

### Chat Events
| Client → Server | Payload | Description |
|----------------|---------|-------------|
| `joinRoom` | `teamId` | Join team chat room |
| `sendMessage` | `{ teamId, content, replyToId }` | Send a message |
| `typing` / `typing-start` | `{ teamId }` | Start typing indicator |
| `stopTyping` / `typing-stop` | `{ teamId }` | Stop typing indicator |

| Server → Client | Description |
|----------------|-------------|
| `newMessage` | New message in a room |
| `userTyping` | Someone is typing |
| `userStoppedTyping` | Someone stopped typing |

### Call Events (WebRTC Signaling)
| Client → Server | Payload | Description |
|----------------|---------|-------------|
| `joinCall` | `{ teamId }` | Join a call room |
| `call-start` | `{ teamId, teamName, callerName }` | Notify team a call started |
| `offer` | `{ to: socketId, offer }` | WebRTC offer |
| `answer` | `{ to: socketId, answer }` | WebRTC answer |
| `ice-candidate` | `{ to: socketId, candidate }` | ICE candidate |
| `leaveCall` | `{ teamId }` | Leave call |
| `get-active-calls` | — | Get list of live call team IDs |

---

## 📄 License

ISC
