CollabHub - Project Report

1. Project Overview
CollabHub is a real-time team communication and video calling web application that I built to make remote teamwork simple and fast. In this app, team members can chat in group channels, send private direct messages, share files, and start live HD video meetings with screen sharing. Users can test their camera and mic in a lobby before joining, and if they get disconnected, they can rejoin the call with one click just like Google Meet. There are two roles: regular Users who chat and join calls, and the Super Admin who manages users, teams, chat moderation, and system settings. I built the backend with Node.js, Express, Socket.io, WebRTC, and Supabase PostgreSQL, and the frontend with clean HTML, CSS, and JavaScript, hosted on Render.

2. Problem Statement
Remote teams often struggle because they use too many different apps — Slack for chat, Zoom or Google Meet for calls, and Google Drive for files. Switching between apps wastes time, and people often miss meetings because they do not get instant alerts. Also, when internet drops, rejoining calls is often difficult. I built CollabHub to solve these problems by putting chat, file sharing, and video calling into one simple, fast website with real-time notifications and easy rejoining.

3. My Approach & How I Solved It
To build this, I connected REST APIs, WebSockets, and WebRTC together:
• Node.js & Express: Handles user login, profile data, team creation, and admin actions.
• Supabase PostgreSQL (Sequelize): Saves all users, teams, chat messages, call history, and notifications safely.
• Socket.io: Delivers chat messages instantly, shows typing status, and alerts teammates when a video call starts.
• WebRTC: Runs high-quality video and audio calls directly inside the browser with screen sharing.
• Cloudinary & Multer: Stores profile photos and chat files securely in the cloud.
• JWT & Roles: Protects private chats and keeps the Super Admin portal separate and secure.

4. Core Features
• User Registration & Login: Secure login with encrypted passwords and profile photo upload.
• Team Workspaces: Create a team or join using a 6-character team invite code.
• Live Team Chat: Instant group messaging with emojis, file attachments, and reply options.
• 1-on-1 Direct Messages: Private chat with online status and unread message counters.
• Pre-Meeting Lobby: Test camera and microphone before entering any video meeting.
• Live Meeting Alerts: Shows a "Meeting Live" badge on the team card and sends instant alerts to members.
• 1-Click Rejoin Call: Easily rejoin an ongoing video call if internet disconnects.
• Full Video Controls: Mute mic, toggle camera, share screen, pin video, and in-call chat.
• Sidebar Notifications: Dedicated notifications tab with filters (All, Messages, Mentions, Calls).
• Safe Leave Team: Confirmation popup to leave a team and automatically switch to the next team.
• Super Admin Portal: View user stats, block/delete users, delete teams, moderate messages, and send alerts.

5. Technologies & Tools Used
Area | Technology / Tool | What it does
--- | --- | ---
Runtime | Node.js + Express | Runs the backend server and handles all API requests
Real-Time Chat | Socket.io | Sends messages, typing alerts, and meeting notifications instantly
Video Calling | WebRTC | Enables live video/audio calls and screen sharing in browser
Database | Supabase PostgreSQL | Stores users, teams, messages, calls, and notifications
ORM | Sequelize | Makes database queries easy using JavaScript
Security | JWT + bcryptjs | Manages user login tokens and encrypts passwords safely
File Upload | Multer + Cloudinary | Uploads and saves user photos and files in cloud storage
Dev Server | nodemon | Restarts backend server automatically during development
Frontend | Plain HTML + CSS + JS | Fast, lightweight UI without any heavy frameworks
Client Storage | localStorage | Saves user login tokens securely in browser
Deployment | Render | Hosts both backend server and frontend website

6. APIs & Their Purpose
API / Service | Purpose
--- | ---
REST API (/api/v1) | Handles login, user profile, teams, message history, and admin settings
Socket.io Events | Delivers live chat, typing indicators, meeting alerts, and WebRTC signals
JWT | Creates a secure token when user logs in to check their permissions on every request
bcryptjs | Hashes passwords before saving so real passwords are never exposed
Cloudinary | Stores uploaded profile pictures and chat files safely with fast download links
Multer | Catches uploaded files from frontend and sends them to Cloudinary
Supabase (Sequelize) | Main database where all users, teams, messages, and calls are stored

7. System Architecture & Workflows

A. Simple Request Flow
User Action (Frontend UI)
       |
Express API Routes (/api/v1) & Socket.io Server
       |
JWT Auth & Security Check
       |
Database (Supabase PostgreSQL) & Cloud Storage (Cloudinary)
       |
Instant Real-time Update to All Connected Teammates

B. Video Call & Rejoin Workflow
1. User clicks "Start Video Call" -> Opens Lobby to test Camera & Mic.
2. User clicks "Join Meeting" -> Video room starts via WebRTC.
3. Socket.io alerts all team members and shows "Meeting Live" on team card.
4. Teammates click "Join Call" -> Connects to video room with screen sharing.
5. If disconnected -> User sees "Rejoin Call" button and returns with 1 click.

8. What Happens When Someone Uses the App
1. User signs up or logs in with email and password.
2. User creates a new team or joins a team with an invite code.
3. User chats with teammates, sends files, and reacts to messages.
4. When someone starts a video call, all team members get a live notification and "Meeting Live" badge.
5. Teammates open the lobby, check their mic/cam, and join the meeting.
6. If someone drops out, they can click "Rejoin Call" to return instantly.
7. Users can check the Notifications sidebar for missed messages, mentions, or calls.
8. Admins can log into the Admin Console to manage users, monitor chat, and view system stats.

9. What Data the App Stores

User
Field | Type | Notes
--- | --- | ---
id | UUID | Unique User ID
name / email | String | User name and login email
password | String | Encrypted password
profilePic | String | Avatar image URL on Cloudinary
role | String | Role (user, admin, SUPER_ADMIN)
isBlocked | Boolean | If user account is suspended

Team & TeamMember
Field | Type | Notes
--- | --- | ---
id | UUID | Unique Team / Member ID
name / inviteCode | String | Team name and 6-letter join code
ownerId / userId | UUID | ID of team owner and member
role | String | Member role (TEAM_ADMIN, MEMBER)

Message & DirectMessage
Field | Type | Notes
--- | --- | ---
id | UUID | Unique Message ID
teamId / recipientId | UUID | Team ID or private receiver ID
senderId / content | UUID / Text | Sender user ID and text message
fileUrl / isDeleted | String / Boolean | File attachment link and delete status

Call & Notification
Field | Type | Notes
--- | --- | ---
callerId / receiverId | UUID | Who called and which team/user received
callType / status | String | Call mode (video/audio) and state (ongoing/ended)
title / content / isRead | String / Boolean | Notification text and read status

10. Main Pages & Actions (Routes)
Area | Sample Routes | Access Level
--- | --- | ---
Auth | POST /api/v1/auth/register<br>POST /api/v1/auth/login | Public (Sign In / Sign Up)
User Profile | GET/PATCH /api/v1/user/me<br>POST /api/v1/user/profile-pic | Logged-in Users
Teams | POST /api/v1/team<br>POST /api/v1/team/join<br>DELETE /api/v1/team/:id/leave | Logged-in Users
Team Chat | GET/POST /api/v1/chat/messages | Team Members
Direct Chat | GET/POST /api/v1/direct/messages | Logged-in Users
Notifications | GET/PATCH /api/v1/notification | Logged-in Users
Admin Console | GET /api/v1/admin/analytics<br>GET/PATCH/DELETE /api/v1/admin/users<br>GET/DELETE /api/v1/admin/teams | Super Admin only

11. Deployment
I deployed the complete application on Render as a single web service. The Node.js backend serves both the REST API and the static frontend files (HTML, CSS, JS) directly using express.static(). Environment variables like DATABASE_URL (Supabase connection), JWT_SECRET, and Cloudinary keys are set in Render settings. The frontend config connects directly to the live backend URL for smooth API and WebSocket connections.

12. Future Improvements
• Add support for larger conference calls with 50+ participants using an SFU media server.
• Add end-to-end encryption for private 1-on-1 direct messages.
• Add meeting recording so teams can save and download video calls.
• Build mobile apps for Android and iOS using React Native.

13. Links & Credentials
• GitHub Repository: https://github.com/Kuwarjibetha/CollabHub
• Backend Live URL: https://collabhub-qvx3.onrender.com
• Frontend Website Link: https://collabhub-1-whx9.onrender.com
• Super Admin Login: bethakuwarji@gmail.com / Kuwarji@9934
• User Login: bethajikuwa@gmail.com / Kuwarji@9934

14. Conclusion
CollabHub is a complete team collaboration and video calling web platform that replaces scattered tools with one clean, unified app. It brings together instant messaging, file sharing, Google Meet-style video meetings, live notifications, and admin controls into a fast and simple user experience. Building this project helped me master Node.js, WebRTC video calling, Socket.io real-time events, Supabase PostgreSQL, and clean modular web development.
