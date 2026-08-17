# CollabHub - Project Report

## 1. Project Overview
**CollabHub** is a real-time team collaboration and communication web platform designed to streamline remote teamwork, messaging, and audio/video conferencing. In this system, team members can collaborate in dedicated team channels or private 1-on-1 direct messages, share files/media securely, react to messages, receive instant notifications, and initiate real-time video/audio calls without leaving the browser. 

There are two primary roles in the system:
- **Member (User)**: Can join/create teams, send channel & direct messages, initiate/join video calls, react to messages, and manage their profile.
- **Admin / Super Admin**: Manages users, monitors team channels, moderates chat content, views platform analytics, and manages permissions.

I built this project using **Node.js**, **Express**, **Sequelize ORM**, and **Supabase PostgreSQL** for the backend, combined with **Socket.io** and **WebRTC** for real-time messaging and video calling, and static **HTML, CSS, and JavaScript** for the frontend.

---

## 2. Problem Statement
Modern remote and hybrid teams often struggle with fragmented tools — using separate apps for team messaging, direct chat, file sharing, and video calling. Switching between multiple platforms causes distraction, lost context, and increased friction in daily collaboration. 

Furthermore, existing tools can be overly complex or lack unified access control and content moderation for team managers. **CollabHub** was created to solve these exact problems by providing an all-in-one, lightweight, and secure workspace where team communication, real-time file sharing, socket-driven chat, WebRTC video calling, and administrative moderation coexist under a single roof.

---

## 3. My Approach & How I Solved It
To address these challenges, I designed a micro-serviced socket & REST architecture:
- **REST API (Express + Sequelize)**: Handles authentication, user management, team setup, historical chat fetching, notifications, and administrative controls.
- **Supabase PostgreSQL Database**: Stores relational data including Users, Teams, Team Memberships, Messages, Reactions, Direct Messages, Call Logs, and Notifications.
- **Socket.io (Real-Time Engine)**: Provides bi-directional events for instant message delivery, live online/offline presence tracking, typing indicators, and message reactions.
- **WebRTC Signaling**: Enables low-latency peer-to-peer audio and video calls directly inside the browser using Socket.io for exchange of SDP offers, answers, and ICE candidates.
- **Cloud Storage (Multer + Cloudinary)**: Secures avatar photos and attachment media (images, videos, documents) uploaded in chat channels.
- **Role-Based Access Control (RBAC)**: JWT authentication ensures users can only access channels and calls for teams they belong to, while Admins enjoy dedicated moderation capabilities.

---

## 4. Core Features
- **User Authentication & Profiles**: Secure registration, login with JWT tokens, password encryption via `bcryptjs`, profile picture uploads, and role assignment.
- **Team & Channel Management**: Users can create teams, join via invite links or team codes, assign roles (`admin`, `member`), and organize conversations into structured channels.
- **Real-Time Group Chat**: Instant channel messaging powered by Socket.io, featuring message reactions (emojis), message deletion/editing, and media attachments.
- **Direct Messaging (1-on-1)**: Private, end-to-end user messaging with read receipts and active status indicators.
- **WebRTC Video & Audio Calls**: In-browser 1-on-1 and group video/audio calls with mute/unmute, camera toggle, screen sharing capability, and call logs.
- **Media & File Attachments**: Image, video, and document file sharing powered by Cloudinary and Multer integration.
- **Instant Notifications**: Automated notification engine alerting users when mentioned in chats, added to a team, or receiving call invitations.
- **Admin Moderation & Analytics Dashboard**: Admins can manage users (block/unblock, role updates), moderate channels, view analytics, and audit team activities.
- **Persistent Chat History & Search**: All channel and direct messages are stored in Supabase PostgreSQL with efficient indexing for quick message retrieval.

---

## 5. Technologies & Tools Used

| Area | Technology / Tool | What it does |
| :--- | :--- | :--- |
| **Runtime** | Node.js + Express (v5) | Runs the backend server and serves REST API endpoints |
| **Database** | Supabase PostgreSQL | Cloud relational database for storing users, messages, teams, and call logs |
| **ORM** | Sequelize | Handles database migrations, schemas, and complex relational queries |
| **Real-Time Engine** | Socket.io | Manages bi-directional WebSocket connections for live chat and notifications |
| **Video Calling** | WebSockets + WebRTC | Enables real-time peer-to-peer video/audio streaming and signaling |
| **Authentication** | JWT + bcryptjs | Secures endpoints and hashes user passwords |
| **File Storage** | Multer + Cloudinary | Processes and hosts user avatars and chat file attachments in the cloud |
| **Environment Config** | dotenv | Manages environment variables securely |
| **Dev Server** | Nodemon | Restarts the Node server automatically during development |
| **Frontend** | Plain HTML5 + CSS3 + JS | Lightweight, fast, and responsive user interface without framework overhead |
| **Client Storage** | LocalStorage / SessionStorage | Persists JWT auth tokens and user session data in the browser |

---

## 6. APIs & Their Purpose

| API / Service | Purpose |
| :--- | :--- |
| **REST API (Express)** | Handles authentication, team setup, chat history retrieval, user profile updates, and admin functions (`/api/v1`). |
| **Socket.io Signaling** | Handles real-time messaging events (`send-message`, `receive-message`, `reaction-add`), typing status, and WebRTC call signaling (`call-user`, `make-answer`, `ice-candidate`). |
| **JWT Authentication** | Generates secure access tokens upon sign-in. Sent in HTTP headers and Socket auth handshakes. |
| **bcryptjs** | Hashes passwords before saving to PostgreSQL for data protection. |
| **Cloudinary API** | Stores uploaded images, documents, and video files, returning CDN URLs. |
| **Multer Middleware** | Intercepts multipart form data uploads from frontend forms before routing to Cloudinary. |
| **Sequelize ORM** | Communicates with Supabase PostgreSQL to execute queries and manage data relationships. |

---

## 7. System Architecture & Diagrams

### A. How the API Works (Request-Response & Socket Flow)
```
  [ Frontend UI (HTML/JS) ]
        |              \
   (HTTP REST)     (WebSocket Event)
        |                \
 [ Express Router ]    [ Socket.io Server ]
        |                /        \
 [ Auth Middleware ]   [ Chat ]  [ WebRTC Signaling ]
        |                 \       /
 [ Controller Layer ]    [ Service Layer ]
        \                       /
   [ Supabase PostgreSQL & Cloudinary ]
```

### B. Data Flow Diagram
```
User Input -> Auth Validation (JWT) -> Controller -> Service Layer -> Supabase DB
     |                                                                   |
(File Upload) -> Multer -> Cloudinary Cloud -> Return CDN URL -----------+
     |
(Real-Time Event) -> Socket.io Server -> Broadcast to Team Room Members
```

### C. Real-Time Chat & Video Call Workflow
```
[ Sender / Caller ]                              [ Receiver ]
        |                                             |
   1. Sends Socket Event ('send_message' / 'call_user')
        |                                             |
   2. Socket.io Server verifies Token & Room Access
        |                                             |
   3. Saves Message in DB (if Chat) / Emits Signal    |
        |-------------------------------------------->|
                                                4. Receives Message / 
                                                   Incoming Call Modal
                                                      |
                                                5. Accepts Call -> Peer-to-Peer
                                                   WebRTC Connection Established
```

### D. Media & File Upload Architecture
```
Frontend Form Data -> Multer Middleware -> Cloudinary Storage API -> Returns CDN URL -> Save URL in PostgreSQL Message Table
```

---

## 8. What Happens When Someone Uses the App
1. **Registration & Login**: A user registers or logs in. The backend verifies credentials using `bcryptjs` and returns a JWT token.
2. **Team Setup**: The user can create a new Team or join an existing Team using a Team Code.
3. **Channel Chatting**: Inside a team, members select a channel and start messaging. Socket.io broadcasts messages instantly to all active team members while Sequelize persists the chat history in Supabase.
4. **1-on-1 Direct Messaging**: Users can search for colleagues and initiate private direct conversations.
5. **Video & Audio Calling**: A user clicks the Call button in a channel or DM. The system triggers WebRTC signaling via Socket.io. When the peer accepts, direct video and audio streams begin.
6. **Reactions & Attachments**: Users can attach images or documents (uploaded to Cloudinary) and react with emojis to messages.
7. **Notifications**: When a user receives a direct message, call request, or team mention, an instant notification is generated.
8. **Admin Moderation**: Admins can log into the Admin Dashboard to view active users, manage team memberships, remove inappropriate messages, and view system metrics.

---

## 9. What Data the App Stores

### User
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` / `email` | String | User display name and unique login email |
| `password` | String | Encrypted password hashed with `bcryptjs` |
| `profilePic` | String | Avatar image URL hosted on Cloudinary |
| `role` | Enum | `SUPER_ADMIN`, `MEMBER`, `admin`, `user` |
| `isBlocked` | Boolean | Account suspension status |

### Team
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` | String | Team name |
| `description` | String | Brief description of the team |
| `ownerId` | UUID | User ID of the team creator |

### TeamMember
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `userId` | UUID | Foreign key referencing User |
| `teamId` | UUID | Foreign key referencing Team |
| `role` | Enum | `TEAM_ADMIN`, `MEMBER`, `admin`, `member` |
| `lastReadAt` | Date | Timestamp for tracking read status |

### Message (Team Chat)
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `senderId` | UUID | Foreign key referencing User |
| `teamId` | UUID | Foreign key referencing Team |
| `content` | Text | Message body text |
| `fileUrl` / `fileType` | String | Cloudinary media link and asset type |
| `isDeleted` | Boolean | Soft delete flag |

### DirectMessage
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `senderId` | UUID | Foreign key referencing sender User |
| `recipientId` | UUID | Foreign key referencing recipient User |
| `content` | Text | Direct message text |
| `isRead` | Boolean | Read status indicator |

### Call
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `callerId` | UUID | Foreign key referencing caller User |
| `receiverId` | UUID | Foreign key referencing receiver User |
| `callType` | Enum | `audio` / `video` |
| `status` | Enum | `initiated`, `ongoing`, `ended`, `missed` |

### Notification
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `userId` | UUID | Foreign key referencing target User |
| `title` / `message` | String | Notification headline and body content |
| `isRead` | Boolean | Read status |

---

## 10. Main Pages & Actions (Routes)

| Area | Route | Access Level |
| :--- | :--- | :--- |
| **Auth** | `POST /api/v1/auth/register`<br>`POST /api/v1/auth/login` | Public |
| **User Profile** | `GET /api/v1/user/profile`<br>`PUT /api/v1/user/profile` | Logged-in Users |
| **Team Management** | `POST /api/v1/team`<br>`GET /api/v1/team`<br>`POST /api/v1/team/join` | Logged-in Users |
| **Team Chat** | `GET /api/v1/chat/messages/:teamId`<br>`POST /api/v1/chat/message` | Team Members |
| **Direct Chat** | `GET /api/v1/direct/messages/:userId`<br>`POST /api/v1/direct/message` | Logged-in Users |
| **Notifications** | `GET /api/v1/notification`<br>`PATCH /api/v1/notification/:id/read` | Logged-in Users |
| **Admin Controls** | `GET /api/v1/admin/users`<br>`PATCH /api/v1/admin/user/:id/block`<br>`GET /api/v1/admin/analytics` | Admin / Super Admin |

---

## 11. Deployment
- **Database**: Hosted on **Supabase PostgreSQL Cloud**, connected via Sequelize ORM with SSL encryption.
- **Backend Service**: Configured for deployment on **Render / Railway / Heroku** as a Node.js web service.
- **Frontend**: Served directly via Express static file middleware (`express.static("frontend")`) or hosted independently.
- **Environment Variables**: `PORT`, `JWT_SECRET`, `DATABASE_URL` (Supabase Connection String), and Cloudinary API keys (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are configured securely via `.env`.

---

## 12. Links & Deployment URLs
- **GitHub Repository**: https://github.com/Kuwarjibetha/CollabHub
- **Backend Live Service URL**: https://collabhub-qvx3.onrender.com
- **Frontend Live Website Link**: https://collabhub-1-whx9.onrender.com
- **User / Admin Login Credentials**:
  - `bethajikuwa@gmail.com` / Password: `Kuwarji@9934`
  - `bethakuwarji@gmail.com` / Password: `Kuwarji@9934`

---

## 13. Future Improvements
- **Screen Sharing & Multi-party Mesh Video Calls**: Expand WebRTC peer connection to support multi-user screen sharing and group conference rooms.
- **End-to-End Encryption (E2EE)**: Implement client-side encryption for direct messages and private file transfers.
- **AI-Powered Chat Summarization**: Integrate LLM APIs to summarize long unread team conversations and action items automatically.
- **Mobile Application**: Build a mobile app version using React Native or Flutter to provide native push notifications.

---

## 13. Conclusion
**CollabHub** is a modern, real-time collaboration platform that unifies chat messaging, file sharing, and video calling into a single web-based application. By pairing **Node.js, Express, and Socket.io** with **Supabase PostgreSQL** and **WebRTC**, the platform provides fast, reliable, and secure communication for remote teams. Building this project helped me master complex relational database architecture with Sequelize, socket event handling, WebRTC peer-to-peer signaling, and role-based access control.
