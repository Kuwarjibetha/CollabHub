# CollabHub — Frontend

> Real-time video collaboration web client — built with pure HTML, CSS, and Vanilla JavaScript. No framework, no build step required.

---

## 🚀 Features

- 🔐 **Authentication** — Signup, Login with JWT stored in localStorage
- 👥 **Team Dashboard** — Create teams, join via invite code, switch between teams
- 💬 **Real-time Chat** — Live messaging powered by Socket.io
- 😄 **Emoji Reactions** — React to messages with emojis
- 💬 **Reply to Messages** — Thread-style reply support
- 📁 **File Sharing** — Upload and share images, videos, documents in chat
- ✏️ **Edit / Delete Messages** — Manage your own messages
- 📩 **Direct Messages** — Private 1-on-1 chat with any team member
- 📹 **Video & Audio Calls** — WebRTC peer-to-peer calls within a team
- 🖥️ **Screen Sharing** — Share your screen during a call
- 🔔 **Notifications** — Real-time in-app notifications
- 🛡️ **Admin Panel** — User management, moderation, analytics (SUPER_ADMIN only)
- 📱 **Responsive UI** — Works on desktop and tablet

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| HTML5 | Page structure and semantic markup |
| CSS3 | Styling, animations, responsive layout |
| Vanilla JavaScript | All app logic, DOM manipulation |
| Socket.io Client | Real-time WebSocket connection |
| WebRTC | Peer-to-peer video/audio/screen sharing |
| Fetch API | REST API calls to backend |

> **No framework. No bundler. No build step.** Just open in browser and it works.

---

## 📁 Project Structure

```
frontend/
├── index.html              # Landing page
├── pages/
│   ├── auth/
│   │   ├── login.html      # Login page
│   │   └── register.html   # Signup page
│   ├── user/
│   │   ├── dashboard.html  # Main app (chat, calls, teams)
│   │   └── profile.html    # User profile
│   └── admin/
│       └── dashboard.html  # Admin panel
├── css/                    # Stylesheets for each page
└── js/
    ├── config.js           # API base URL and socket URL config
    └── pages/
        ├── auth/
        │   ├── login.js    # Login logic
        │   └── register.js # Signup logic
        ├── user/
        │   ├── dashboard.js  # Main app (socket, chat, call, teams — ~2000+ lines)
        │   └── profile.js    # Profile update logic
        └── admin/
            └── dashboard.js  # Admin panel logic
```

---

## 📄 Pages

| Page | File | Description |
|------|------|-------------|
| Landing | `index.html` | Public landing/home page |
| Login | `pages/auth/login.html` | User login |
| Register | `pages/auth/register.html` | New user signup |
| Dashboard | `pages/user/dashboard.html` | **Main app** — teams, chat, calls |
| Profile | `pages/user/profile.html` | View and update profile |
| Admin | `pages/admin/dashboard.html` | Admin-only management panel |

---

## ⚙️ Configuration

All API and socket URLs are in one place:

```js
// frontend/js/config.js
const CONFIG = {
  API_BASE: "https://your-backend-url.com/api/v1",
  SOCKET_URL: "https://your-backend-url.com",
};
```

**For local development**, change to:
```js
const CONFIG = {
  API_BASE: "http://localhost:5000/api/v1",
  SOCKET_URL: "http://localhost:5000",
};
```

---

## 🏃 How to Run

### Option 1 — VS Code Live Server (Recommended)
1. Install the **Live Server** extension in VS Code
2. Right-click `frontend/index.html` → **Open with Live Server**
3. App runs at `http://127.0.0.1:5500`

### Option 2 — Any Static File Server
```bash
# Using Python
cd frontend
python3 -m http.server 5500

# Using Node.js serve
npx serve .
```

### Option 3 — Direct file open
Simply open `index.html` in your browser.  
> ⚠️ Some browsers restrict `fetch` on `file://` URLs. Use Live Server for best experience.

---

## 🔑 Authentication Flow

```
User opens app
  → No token in localStorage → redirect to login.html
  → Login successful → JWT stored in localStorage
  → All API requests send: Authorization: Bearer <token>
  → Socket connects with: { auth: { token } }
```

Token is stored in `localStorage` as `token`. User data is stored as `user`.

---

## 📹 Video Call Flow

```
User clicks "Present / Join Call"
  → Socket emits joinCall({ teamId })
  → Server sends back list of existing participants
  → WebRTC offer/answer/ICE exchange via socket relay
  → Peer-to-peer video stream established
  → Screen share: replaces video track in all peer connections
```

---

## 🗂️ Key Files

| File | Role |
|------|------|
| `js/config.js` | **Change this** to point to your backend URL |
| `js/pages/user/dashboard.js` | Core app logic — socket, chat, WebRTC, teams |
| `js/pages/auth/login.js` | Login + token storage |
| `js/pages/auth/register.js` | Signup flow |
| `js/pages/admin/dashboard.js` | Admin panel logic |

---

## 🔗 Backend

This frontend connects to the **CollabHub Backend**.  
See [`Backend/README.md`](../Backend/README.md) for setup instructions.

---

## 📄 License

ISC
