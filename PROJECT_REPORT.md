CollabHub - Project Report

1. Project Overview
CollabHub is a real-time team collaboration, group messaging, and WebRTC video conferencing web application that I developed to make remote teamwork, communication, and meetings seamless and organized in one single platform. In this system, team members can create or join teams, chat in real-time channels, send 1-on-1 direct messages, share files and media, preview their camera and microphone in a pre-meeting lobby, start instant HD video meetings, and rejoin ongoing calls if disconnected without needing third-party meeting links. There are two primary types of users in the system: Team Members (Users) who collaborate within teams, chat, and participate in video calls, and the Super Admin who manages platform users, teams, chat moderation, broadcast announcements, and background jobs. I built this project using Node.js, Express, Socket.io, WebRTC, and Supabase PostgreSQL with Sequelize ORM for the backend, with clean modular HTML5, CSS3, and JavaScript on the frontend, all deployed on Render.

2. Problem Statement
In most remote teams, communication is heavily fragmented across multiple different applications — using tools like Slack for messaging, Google Meet or Zoom for video calls, and separate cloud drives for file sharing. Switching between multiple apps creates context switching, causes team members to miss live meetings because there is no instant notification or live meeting indicator, and makes it hard to rejoin when an internet connection drops. Additionally, many collaboration tools lack proper administrative moderation controls for managing users, monitoring channels, and broadcasting announcements. I built CollabHub to solve exactly these problems: to give teams a unified, fast, and interactive workspace for chat, file sharing, and Google Meet-style video conferencing, while giving administrators a dedicated control console to manage the entire platform.

3. My Approach & How I Solved It
To solve these challenges, I built an integrated real-time micro-architecture where REST APIs, WebSockets, and WebRTC peer connections work together seamlessly. I used Node.js and Express for the backend REST API, Supabase PostgreSQL with Sequelize ORM to store all relational data, and JWT tokens for secure authentication and role-based access control. For real-time chat, live presence, typing indicators, and meeting alerts, I used Socket.io to broadcast events instantly to room members. For video conferencing, I implemented WebRTC with Socket.io signaling, allowing peer-to-peer video streaming, screen sharing, and a pre-meeting lobby where users test camera/mic before joining. To prevent missed meetings, the system displays a live pulsing "Meeting Live" badge on team cards and sends instant notifications. If someone drops off a call unexpectedly, a one-click Rejoin banner allows them to instantly rejoin like Google Meet. For media sharing, I used Multer with Cloudinary so images, videos, and documents are stored securely in the cloud.

4. Core Features
• Users can register, log in, manage their profile details, and upload avatar profile pictures stored on Cloudinary.
• Users can create teams with unique invite codes or join existing teams instantly using a 6-character code.
• Real-time channel group chat powered by Socket.io, featuring message reactions (emojis), quote replies, and file attachments.
• Private 1-on-1 Direct Messaging between users with live unread counters and online/offline status indicators.
• Pre-Meeting Lobby preview allowing users to inspect camera video, test microphone audio, and toggle devices before entering calls.
• Live "Meeting Live" status badge displayed on team cards so all members know a call is currently active.
• Instant meeting broadcast notifications sent to all team members with a direct "Join Call" action button.
• One-click Sudden Disconnect Rejoin mechanism allowing users to jump back into active meetings immediately if disconnected.
• Full In-Call WebRTC Controls: mute/unmute mic, toggle video camera, screen sharing, pinned speaker tile, in-call chat, and live duration timer.
• Dedicated Interactive Sidebar Notifications panel with category filter tabs (All, Messages, Mentions, Calls) and real-time unread badges.
• Safe Leave Team flow with a confirmation modal and automatic fallback to remaining teams.
• Discreet Super Admin Console accessible from the footer with strict role protection (Super Admin only).
• Admin Management Suite: platform analytics, user blocking/unblocking/deletion, team management, real-time chat stream moderation, rate limits, broadcast announcements, and background job queue controls.
• Clean, modular frontend architecture with decoupled HTML pages, CSS stylesheets, and JS modules with zero comments.

5. Technologies & Tools Used
Area | Technology / Tool | What it does
--- | --- | ---
Runtime | Node.js + Express (v5) | Runs the backend server and handles all REST API requests
Real-Time Engine | Socket.io | Manages bi-directional WebSocket connections for live chat, typing indicators, and instant meeting notifications
Video & Audio | WebRTC (RTCPeerConnection) | Enables real-time peer-to-peer audio/video calling, screen sharing, and media streaming directly in the browser
Database | Supabase PostgreSQL | Scalable cloud relational database for storing users, teams, messages, calls, and notifications
ORM | Sequelize | Lets me define database models, handle migrations, and write relational queries in JavaScript
Authentication | JWT + bcryptjs | Handles user authentication, generates secure session tokens, and hashes passwords securely
File Upload | Multer + Cloudinary | Accepts uploaded profile pictures and chat files and stores them safely in the cloud CDN
Config | dotenv | Keeps sensitive values like database connection strings and Cloudinary API keys out of code
Dev Server | nodemon | Automatically restarts the Node.js backend server whenever changes are saved
Frontend | Plain HTML5 + CSS3 + JS | Modular, fast, and responsive user interface without framework bloat or complex build steps
Client Storage | localStorage + sessionStorage | Saves the JWT login token and user session data in the browser
Deployment | Render | Hosts the backend API service and serves the static frontend application

6. APIs & Their Purpose
API / Service | Purpose
--- | ---
REST API (Express) | The primary backend API handling authentication, user profiles, team operations, historical message fetching, notifications, and admin controls. All routes are prefixed with /api/v1.
Socket.io Events | Handles real-time messaging (send-message, receive-message), typing status, meeting live broadcasts, and WebRTC call signaling (call-user, make-answer, ice-candidate).
JWT | Generates an encrypted token upon login. This token is verified on every API request and socket connection to identify the user and enforce role permissions.
bcryptjs | Hashes passwords with salt rounds before saving to PostgreSQL so user credentials remain completely secure.
Cloudinary | Cloud media storage service used to store user profile pictures and chat attachments, returning high-speed CDN URLs.
Multer | Middleware that handles multipart form data file uploads from the frontend before transferring them to Cloudinary.
Supabase PostgreSQL (via Sequelize) | Relational database storing users, teams, team memberships, messages, direct messages, calls, and notifications. Sequelize manages all relationships and transactions.

7. System Architecture & Diagrams

A. How the API Works (Request-Response Flow)
Frontend (UI: HTML / CSS / JS)
        |                     \
   (HTTP REST API)       (Socket.io WebSockets)
        |                       \
 Express Router (/api/v1)     Socket Server
        |                       /       \
 Auth Middleware (JWT)      [ Chat ]   [ WebRTC Signaling ]
        |                      \         /
 Controller Layer            Service Layer (Business Logic)
        \                         /
    Supabase PostgreSQL & Cloudinary CDN
                 \       /
         Response Utility (JSON)
                 \       /
        Frontend UI Updates

B. Data Flow Diagram
User Action -> Auth Validation (JWT) -> Controller -> Service Layer -> PostgreSQL Database
     |                                                                         |
(File Upload) -> Multer Middleware -> Cloudinary Cloud -> Return CDN URL ------+
     |
(Real-Time Event) -> Socket.io Server -> Broadcast to Team Members / Direct Recipient

C. How User Workflows Work

[ User: Start Video Meeting ]
             |
   Opens Pre-Meeting Lobby (Camera & Mic Preview Toggle)
             |
   Clicks "Join Meeting" -> WebRTC Room Created
             |
   Socket.io broadcasts 'call-started' to all Team Members
             |
   Team cards display pulsing "Meeting Live" Badge & Notification Sent
             |
[ Teammate: Click "Join Call" or Lobby Preview ]
             |
   WebRTC Peer Connection Established (Video/Audio/Screen Share Live)
             |
(If Disconnected / Leave Accidental)
             |
   "Meeting is Live" Banner shows One-Click "Rejoin Call" Button
             |
   Rejoins ongoing session seamlessly like Google Meet

D. Document & Media Upload Architecture
Frontend Form Data -> Multer Middleware -> Cloudinary Cloud API -> Returns Secure CDN URL -> Controller saves file URL in PostgreSQL Message Table -> Broadcast to Chat

8. What Happens When Someone Uses the App
• A user registers an account, logs in, and is directed to their collaboration dashboard with their active teams list.
• The user can create a new team or enter a 6-character team invite code to join a colleague's team.
• Inside a team, members exchange real-time chat messages, send file attachments (stored on Cloudinary), react with emojis, and view live typing indicators.
• When a member clicks "Start Video Call", they enter the pre-meeting lobby to preview and adjust their camera/mic before entering the room.
• As soon as the call begins, Socket.io broadcasts an alert to all teammates and sets a live "Meeting Live" badge on the team card.
• Teammates can click the notification or team card to preview the lobby and join the call. In-call features include screen sharing, mic mute, camera toggle, pinned view, and in-call text chat.
• If a teammate leaves or gets disconnected, they can click the prominent "Rejoin Call" button to return to the active meeting instantly.
• Users can open the sidebar Notifications panel to view unread messages, mentions (@user), and call invitations with direct action buttons.
• If a member chooses to leave a team, a confirmation modal appears, and upon confirming, the team is cleanly removed and the next team is selected.
• Super Admins can access the discreet Admin Console via the footer to view platform statistics, block/delete users, audit teams, delete inappropriate messages, broadcast system alerts, and manage background job queues.

9. What Data the App Stores

User
Field | Type | Notes
--- | --- | ---
id | UUID | Primary Key
name / email | String | User display name and unique login email
password | String | Encrypted password hashed with bcryptjs
profilePic | String | User avatar URL stored on Cloudinary
role | Enum | User role (SUPER_ADMIN, MEMBER, admin, user)
isBlocked | Boolean | Account suspension status flag

Team
Field | Type | Notes
--- | --- | ---
id | UUID | Primary Key
name | String | Name of the team workspace
description | String | Brief description of team purpose
inviteCode | String | Unique 6-character code for joining team
ownerId | UUID | Foreign Key referencing User (Team Creator)

TeamMember
Field | Type | Notes
--- | --- | ---
id | UUID | Primary Key
teamId | UUID | Foreign Key referencing Team
userId | UUID | Foreign Key referencing User
role | Enum | Membership role (TEAM_ADMIN, MEMBER)
lastReadAt | Date | Timestamp for tracking unread messages

Message (Team Chat)
Field | Type | Notes
--- | --- | ---
id | UUID | Primary Key
teamId | UUID | Foreign Key referencing Team
senderId | UUID | Foreign Key referencing User
content | Text | Chat message text content
fileUrl / fileType | String | Cloudinary media link and file extension
isDeleted | Boolean | Soft delete moderation flag

DirectMessage
Field | Type | Notes
--- | --- | ---
id | UUID | Primary Key
senderId | UUID | Foreign Key referencing sender User
recipientId | UUID | Foreign Key referencing recipient User
content | Text | 1-on-1 private message content
isRead | Boolean | Read receipt status indicator

Call
Field | Type | Notes
--- | --- | ---
id | UUID | Primary Key
callerId | UUID | Foreign Key referencing caller User
receiverId | UUID | Foreign Key referencing receiver User / Team
callType | Enum | Call mode (video, audio)
status | Enum | Call state (initiated, ongoing, ended, missed)
duration | Number | Total call duration in seconds

Notification
Field | Type | Notes
--- | --- | ---
id | UUID | Primary Key
userId | UUID | Foreign Key referencing target User
type | Enum | Notification type (message, call, mention, team_update)
title / content | String | Headline and message details
relatedId | UUID | References related team, message, or call ID
isRead | Boolean | Read status flag

10. Main Pages & Actions (Routes)

Area | Sample Routes | Access
--- | --- | ---
Auth | POST /api/v1/auth/register<br>POST /api/v1/auth/login | Public (Sign In / Sign Up)
User Profile | GET /api/v1/user/me<br>PATCH /api/v1/user/me<br>POST /api/v1/user/profile-pic<br>PATCH /api/v1/user/change-password | Logged-in Users
Team Management | POST /api/v1/team<br>GET /api/v1/team<br>POST /api/v1/team/join<br>DELETE /api/v1/team/:id/leave<br>DELETE /api/v1/team/:id | Logged-in Users / Team Creator
Team Chat | GET /api/v1/chat/messages/:teamId<br>POST /api/v1/chat/message<br>DELETE /api/v1/chat/message/:id | Team Members
Direct Messages | GET /api/v1/direct/messages/:userId<br>POST /api/v1/direct/message | Logged-in Users
Notifications | GET /api/v1/notification<br>PATCH /api/v1/notification/:id/read<br>PATCH /api/v1/notification/read-all | Logged-in Users
Admin Console | GET /api/v1/admin/analytics<br>GET /api/v1/admin/users<br>PATCH /api/v1/admin/users/:id/block<br>DELETE /api/v1/admin/users/:id<br>GET/DELETE /api/v1/admin/teams<br>GET/DELETE /api/v1/admin/messages<br>POST /api/v1/admin/broadcast<br>POST /api/v1/admin/jobs/:action | Super Admin role only

11. Deployment
I deployed the entire application on Render as a production web service. Since the frontend is built using clean modular HTML5, CSS3, and JavaScript, the Node.js backend serves all frontend files directly using express.static(), eliminating the need for a separate frontend build or complex multi-server deployment. Environment variables like PORT, JWT_SECRET, DATABASE_URL (Supabase PostgreSQL Connection String), and Cloudinary API credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are managed securely in the Render environment settings. On the client side, frontend/js/config.js connects to the live backend URL, ensuring smooth socket connections, API requests, and WebRTC peer signaling.

12. Future Improvements
• Multi-party WebRTC SFU/MCU integration to support large video conferences with 50+ concurrent video feeds.
• End-to-End Encryption (E2EE) for direct messages and private media transfers.
• Automated Meeting Recording and Cloud Storage to allow users to save and replay team video meetings.
• AI-Powered Meeting Summarization using LLMs to automatically generate notes and action items from chat discussions.
• Native Mobile Applications for iOS and Android using React Native or Flutter with push notification support.

13. Links
• GitHub Repository: https://github.com/Kuwarjibetha/CollabHub
• Backend Live Service URL: https://collabhub-qvx3.onrender.com
• Frontend Live Website Link: https://collabhub-1-whx9.onrender.com
• Super Admin Login Credentials: bethakuwarji@gmail.com / Kuwarji@9934
• User / Alternative Login: bethajikuwa@gmail.com / Kuwarji@9934

14. Conclusion
CollabHub is a comprehensive, real-time collaboration and video conferencing platform that replaces fragmented third-party tools with an all-in-one digital workspace. By combining instant channel messaging, file sharing, Google Meet-style WebRTC video calling, dedicated notifications, and strict super-admin governance, the platform provides seamless communication for distributed teams. Building this project helped me master full-stack Node.js development, WebRTC peer signaling, real-time WebSocket architecture with Socket.io, cloud relational database design with Supabase PostgreSQL and Sequelize, and clean modular frontend architecture.
