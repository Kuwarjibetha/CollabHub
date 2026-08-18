# CollabHub — Comprehensive Project Report & Documentation

## 1. Executive Summary
**CollabHub** is a production-grade, real-time team collaboration and communication web platform designed to streamline remote teamwork, high-fidelity messaging, and WebRTC-powered video/audio conferencing. It unifies team channels, direct 1-on-1 messaging, file/media sharing, instant notifications, team management, and multi-user video meetings into a single, high-performance web application.

The platform provides a distinct, secure separation of roles:
- **Team Member / User**: Can join or create teams, participate in channels & direct chats, send file attachments, react to messages, preview their camera/mic in a pre-meeting lobby, start or rejoin active video meetings, and manage their profile.
- **Super Admin**: Has access to a dedicated Admin Control Console for real-time platform analytics, user moderation (block, unblock, delete), team management, live chat moderation, system rate limits, broadcast notifications, and background job queue management.

---

## 2. Problem Statement & Solution

### The Problem
Modern distributed teams face heavy context switching and productivity loss by juggling separate applications for team chat (e.g. Slack), video conferencing (e.g. Google Meet/Zoom), and file sharing. Moreover, open-source solutions often lack:
- Reliable instant meeting alerts and live call status indicators for teammates.
- Pre-call lobby checks and seamless rejoining mechanisms when connections drop unexpectedly.
- Role-based separation between everyday collaboration and super-administrative controls.
- Clean, maintainable, modular frontend code.

### The CollabHub Solution
CollabHub resolves these challenges through:
1. **Unified Workspace**: Chat, media sharing, and video calls in one lightweight, responsive interface without third-party meeting links.
2. **Google Meet-Style Meetings**: Pre-meeting lobby with camera/mic toggles, live "Meeting is Live" team badges, active call broadcast notifications, and one-click instant call rejoin.
3. **Interactive Sidebar Notifications**: Dedicated sidebar panel with multi-category filtering (`All`, `Messages`, `Mentions`, `Calls`), real-time unread badges, and direct action triggers.
4. **Strict Role-Based Access Control (RBAC)**: Distinct User Collaboration Hub vs. Super Admin Control Console with discrete entry points and JWT authorization.
5. **Modular, High-Performance Architecture**: Zero-framework vanilla HTML5, CSS3, and JavaScript frontend separated cleanly into dedicated stylesheets, scripts, and views, backed by Node.js, Express, Socket.io, Sequelize, and Supabase PostgreSQL.

---

## 3. System Architecture & Tech Stack

```
+-------------------------------------------------------------------------+
|                              FRONTEND LAYER                             |
|  HTML5 Pages (/pages/user, /pages/admin, /pages/auth, index.html)       |
|  CSS3 Modules (/css/dashboard.css, admin.css, landing.css, profile.css) |
|  JavaScript Modules (/js/pages/user/dashboard.js, admin/dashboard.js)   |
+------------------------------------+------------------------------------+
                                     |
                               HTTP REST / WebSocket Events
                                     |
+------------------------------------+------------------------------------+
|                               BACKEND LAYER                             |
|  Node.js + Express REST API (/api/v1/*)                                 |
|  Socket.io Real-Time Engine (Chat delivery, WebRTC signaling, alerts)  |
|  JWT & BCrypt Authentication Middleware                                |
|  Multer + Cloudinary File Upload Processing                            |
+------------------------------------+------------------------------------+
                                     |
                               Sequelize ORM (SSL)
                                     |
+------------------------------------+------------------------------------+
|                              DATABASE LAYER                             |
|  Supabase Cloud PostgreSQL (Users, Teams, Messages, Calls, DMs, Logs)   |
+-------------------------------------------------------------------------+
```

### Technologies & Frameworks

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Structure** | HTML5 (Semantic) | Page templates and UI components |
| **Frontend Styling** | CSS3 (Custom Design System) | Glassmorphism, animations, responsive grid/flexbox layouts |
| **Frontend Logic** | Vanilla JavaScript (ES6+) | Modular page controllers, DOM updates, WebRTC & Socket clients |
| **Backend Runtime** | Node.js (v20+) | High-throughput asynchronous server runtime |
| **Web Framework** | Express (v5) | RESTful API endpoints and middleware pipeline |
| **Real-Time Communication** | Socket.io | Bi-directional WebSocket events for chat, presence & signaling |
| **Video & Audio** | WebRTC (RTCPeerConnection) | Low-latency peer-to-peer audio/video streaming & screen sharing |
| **Relational Database** | Supabase PostgreSQL | Scalable cloud PostgreSQL with foreign keys and indexes |
| **ORM / Migration** | Sequelize | Model definitions, associations, database migrations, and queries |
| **Security & Auth** | JWT + bcryptjs | Token-based auth guard and password hashing |
| **Media Hosting** | Cloudinary + Multer | Cloud storage and CDN delivery for user profile pictures and files |

---

## 4. Key Modules & Functional Workflows

### A. Video Calling & Meeting Room Suite
- **Pre-Meeting Lobby**: Users can preview their camera stream, test and toggle their microphone and camera before entering the room.
- **Team Live Call Indicator**: When a meeting starts, a live pulse badge (*"Meeting Live"*) appears on the team card in the sidebar for all members.
- **Broadcast Call Notifications**: Starting a call sends instant socket and notification alerts to all team members with direct "Join Call" action buttons.
- **Google Meet-style Rejoin**: If a user leaves or drops connection unexpectedly, an active call banner and one-click Rejoin button allows immediate re-entry.
- **In-Call Controls**: Camera toggle, mic mute/unmute, screen share toggle, pinned video tile, floating call chat, dynamic participant grid, and live elapsed call timer.

### B. Real-Time Chat & Direct Messaging
- **Team Channels**: Real-time group messaging with instant broadcast via Socket.io rooms and persistent database storage.
- **1-on-1 Direct Chat**: Private messaging with read status indicators and user presence (online/offline).
- **Mentions & Replies**: Support for `@user` mentions and quote-replies to specific messages.
- **Rich Media & File Attachments**: Upload and preview images, documents, and files directly in chat streams.
- **Unread Message Counters**: Real-time unread badges per team and direct conversation.

### C. Sidebar Notifications Center
- **Sidebar View Toggle**: Clicking the Bell navigation icon switches the sidebar between the Teams list and the Notifications panel.
- **Multi-Category Tabs**:
  - `All`: Complete activity feed.
  - `💬 Msg`: Unread message alerts.
  - `🏷️ @`: Mention alerts.
  - `📹 Calls`: Live call invitations and meeting updates.
- **Direct Interactive Actions**:
  - `📹 Join Call`: Instantly opens team context and launches meeting lobby.
  - `💬 Open Chat`: Switches directly to the corresponding channel.
  - `Mark Read` & `Read All`: Updates read status across server and local persistence.

### D. Team Management & Safe Exit Flow
- **Create & Join Teams**: Create new teams or join existing teams via 6-character invite codes.
- **Role Permissions**: Team Creator / Team Admin controls vs. Member permissions.
- **Safe Leave Team Action**:
  - Confirmation modal (`modal-leave-team-confirm`) prevents accidental exits.
  - `DELETE /team/:teamId/leave` API cleanly removes membership.
  - Automatically transitions to the next available team or displays the empty welcome screen.

### E. Super Admin Control Console
- **Discreet Access Point**: Positioned discreetly in the landing page footer, preventing clutter for regular users.
- **Strict Role Authorization**: Only authenticated users with `SUPER_ADMIN` or `admin` roles can access the console.
- **Management Capabilities**:
  - **Platform Analytics**: Total users, active users, total teams, total messages.
  - **User Management**: Search users, toggle account blocks/unblocks, permanently delete accounts.
  - **Team Management**: View teams, invite codes, member counts, delete teams.
  - **Chat Moderation**: Real-time stream of all team messages with instant moderation delete.
  - **System Controls**: Configure participant limits, API rate limits, and file size limits.
  - **Broadcast Engine**: Send system-wide broadcast alerts to all connected users.
  - **Background Worker Queues**: Pause, resume, check status, and retry failed background jobs.

---

## 5. Clean Codebase & Directory Structure

The frontend is strictly decoupled into semantic HTML pages, dedicated CSS stylesheets, and modular JavaScript controllers with zero comments for clean maintainability:

```
video_colla/
├── Backend/
│   ├── config/              # Database connection & Sequelize setup
│   ├── controllers/v1/      # REST API route controllers
│   ├── middleware/          # JWT Auth, Multer, and Admin guards
│   ├── models/              # Sequelize database models & associations
│   ├── routes/v1/           # Express API route declarations
│   ├── service/v1/          # Business logic & DB transactions
│   ├── socket/              # Socket.io chat & WebRTC signaling handlers
│   ├── scripts/             # Migration & seed scripts
│   ├── app.js               # Express application entry point
│   └── package.json
│
├── frontend/
│   ├── index.html           # Landing page
│   ├── css/
│   │   ├── style.css        # Base design tokens, typography, utilities & modals
│   │   ├── landing.css      # Landing page styles & keyframe animations
│   │   ├── auth.css         # Auth cards, forms & animated background orbs
│   │   ├── dashboard.css    # Collaboration hub, chat, video grid & sidebar
│   │   ├── admin.css        # Super admin layout, data tables & stat cards
│   │   └── profile.css      # User profile, avatar management & session
│   ├── js/
│   │   ├── config.js        # API endpoints, Auth session & apiFetch helper
│   │   └── pages/
│   │       ├── landing.js          # Landing page navigation & interactions
│   │       ├── auth/auth.js        # Login & Signup form handling
│   │       ├── admin/dashboard.js  # Admin moderation & system control logic
│   │       ├── user/dashboard.js   # Core App: Chat, WebRTC calls, Sockets, Notifs
│   │       └── user/profile.js     # Profile updates, avatar upload, password reset
│   └── pages/
│       ├── auth/auth.html          # Authentication (Sign in / Sign up)
│       ├── admin/dashboard.html    # Super Admin Control Console
│       ├── user/dashboard.html     # User Collaboration Dashboard
│       └── user/profile.html       # User Profile & Settings
│
├── CollabHub_Project_Report.pdf
├── PROJECT_REPORT.md        # Updated Project Report & Technical Documentation
└── README.md
```

---

## 6. Database Schema Summary

| Table | Primary Key | Key Fields & Foreign Keys | Description |
| :--- | :--- | :--- | :--- |
| **Users** | `id` (UUID) | `name`, `email`, `password`, `profilePic`, `role`, `isBlocked` | User identity and account credentials |
| **Teams** | `id` (UUID) | `name`, `description`, `inviteCode`, `ownerId` (FK -> Users) | Collaboration team workspaces |
| **TeamMembers** | `id` (UUID) | `teamId` (FK -> Teams), `userId` (FK -> Users), `role`, `lastReadAt` | Team membership & permissions |
| **Messages** | `id` (UUID) | `teamId` (FK -> Teams), `senderId` (FK -> Users), `content`, `fileUrl`, `fileType`, `isDeleted` | Team channel chat messages |
| **DirectMessages**| `id` (UUID) | `senderId` (FK -> Users), `recipientId` (FK -> Users), `content`, `isRead` | 1-on-1 private messaging |
| **Calls** | `id` (UUID) | `callerId` (FK -> Users), `receiverId` (FK -> Users), `callType`, `status`, `duration` | Audio/video call history & logs |
| **Notifications** | `id` (UUID) | `userId` (FK -> Users), `type`, `title`, `content`, `relatedId`, `isRead` | System and activity notifications |

---

## 7. REST API Endpoints Reference

### Authentication & User (`/api/v1/auth`, `/api/v1/user`)
- `POST /auth/register` — Register a new user account
- `POST /auth/login` — Authenticate user and receive JWT
- `GET /user/me` — Fetch current user profile
- `PATCH /user/me` — Update name and personal information
- `POST /user/profile-pic` — Upload user avatar to Cloudinary
- `PATCH /user/change-password` — Change account password

### Teams & Channels (`/api/v1/team`)
- `POST /team` — Create a new team
- `GET /team` — List all teams the user belongs to
- `GET /team/:teamId` — Fetch team details and member list
- `POST /team/join` — Join a team using an invite code
- `DELETE /team/:teamId/leave` — Leave a team (with auto-reassignment/cleanup)
- `DELETE /team/:teamId` — Delete a team (Owner / Super Admin)

### Chat & Messaging (`/api/v1/chat`, `/api/v1/direct`)
- `GET /chat/messages/:teamId` — Fetch historical messages for a team
- `POST /chat/message` — Send message with optional media attachment
- `DELETE /chat/message/:messageId` — Delete a message
- `GET /direct/messages/:userId` — Fetch direct chat conversation
- `POST /direct/message` — Send 1-on-1 direct message

### Notifications (`/api/v1/notification`)
- `GET /notification` — List user notifications
- `PATCH /notification/:id/read` — Mark a notification as read
- `PATCH /notification/read-all` — Mark all notifications as read

### Super Admin Console (`/api/v1/admin`)
- `GET /admin/analytics` — Platform metrics (users, active sessions, teams, messages)
- `GET /admin/users` — Search and list all registered users
- `PATCH /admin/users/:id/block` — Toggle user account block/unblock status
- `DELETE /admin/users/:id` — Permanently delete user account
- `GET /admin/teams` — List all teams with invite codes & member counts
- `DELETE /admin/teams/:id` — Force delete a team
- `GET /admin/messages` — Moderate and view all chat message streams
- `DELETE /admin/messages/:id` — Delete inappropriate chat message
- `POST /admin/broadcast` — Send system-wide alert notification
- `POST /admin/jobs/:action` — Pause, resume, or check background worker queues
- `POST /admin/jobs/retry-failed` — Re-queue and retry failed background jobs

---

## 8. Deployment & Environment Configuration

### Live URLs & Repository
- **GitHub Repository**: [https://github.com/Kuwarjibetha/CollabHub](https://github.com/Kuwarjibetha/CollabHub)
- **Backend API Service**: [https://collabhub-qvx3.onrender.com](https://collabhub-qvx3.onrender.com)
- **Frontend Web Application**: [https://collabhub-1-whx9.onrender.com](https://collabhub-1-whx9.onrender.com)

### Verified Test Credentials
- **Super Admin Account**:
  - Email: `bethakuwarji@gmail.com`
  - Password: `Kuwarji@9934`
- **Alternative Admin / User Account**:
  - Email: `bethajikuwa@gmail.com`
  - Password: `Kuwarji@9934`

### Required Environment Variables (`.env`)
```ini
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://postgres.qvx...:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=super_secret_jwt_key_collabhub_2026
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGIN=*
```

---

## 9. Conclusion
CollabHub successfully delivers an integrated, scalable, and modern real-time collaboration ecosystem. By combining **Node.js, Express, Socket.io, WebRTC, and Supabase PostgreSQL** with a modular frontend architecture, it eliminates tool fragmentation and provides an enterprise-ready platform for messaging, audio/video conferencing, notifications, and team governance.
