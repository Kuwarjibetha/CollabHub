// ==========================================
// CollabHub — Dashboard JS
// Complete: Teams, Chat, Socket.io, WebRTC
// ==========================================

// Auth Guard
if (!Auth.isLoggedIn()) {
  window.location.href = "../auth/auth.html";
}

// ---- State ----
let socket = null;
let currentTeam = null;
let allTeams = [];
let teamMembers = [];
let onlineUsers = new Set();
let typingTimer = null;
let isTyping = false;

// WebRTC
let localStream = null;
let peers = {};           // socketId -> RTCPeerConnection
let peerMeta = {};        // socketId -> { userId, name }
let pinnedTileId = null;
let callChatOpen = false;
let callTimerInterval = null;
let callSeconds = 0;
let isMicOn = true;
let isVideoOn = true;
let pendingCallData = null;
let pendingTeamCall = null;
let activeCallTeamId = null;

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const API = CONFIG.API_BASE;
const SOCKET_URL = CONFIG.SOCKET_URL;
const user = Auth.getUser();

// ==========================================
// INIT
// ==========================================
async function init() {
  if (!user) return logout();
  initUI();
  connectSocket();

  // Fallback: Hide loading screen within 2.5s max so user is never stuck
  const timeout = setTimeout(() => hideLoading(), 2500);

  try {
    await loadTeams();
    fetchAndRenderNotifications();
  } catch (err) {
    console.warn("Initial data load delay/error:", err);
  } finally {
    clearTimeout(timeout);
    hideLoading();
  }
}

function initUI() {
  const currentUser = Auth.getUser() || user;
  const name = currentUser.name || currentUser.email || "User";
  const email = currentUser.email || "";
  const initials = name.charAt(0).toUpperCase();

  // Rail avatar
  const rail = document.getElementById("user-avatar-rail");
  if (rail) {
    if (currentUser.profilePic) {
      const src = currentUser.profilePic.startsWith('http')
        ? currentUser.profilePic
        : `${SOCKET_URL}${currentUser.profilePic.startsWith('/') ? '' : '/'}${currentUser.profilePic}`;
      rail.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    } else {
      rail.textContent = initials;
    }
  }

  // Sidebar User Card
  const sideName = document.getElementById("sidebar-user-name");
  const sideEmail = document.getElementById("sidebar-user-email");
  const sideAvatar = document.getElementById("sidebar-user-avatar");

  if (sideName) sideName.textContent = name;
  if (sideEmail) sideEmail.textContent = email;
  if (sideAvatar) {
    if (currentUser.profilePic) {
      const src = currentUser.profilePic.startsWith('http')
        ? currentUser.profilePic
        : `${SOCKET_URL}${currentUser.profilePic.startsWith('/') ? '' : '/'}${currentUser.profilePic}`;
      sideAvatar.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    } else {
      sideAvatar.textContent = initials;
    }
  }

  updateAdminVisibility();
}

function updateAdminVisibility() {
  const currentUser = Auth.getUser() || user || {};
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'admin';

  // Global Admin Panel in left rail / nav — only SUPER_ADMIN
  const adminBtn = document.getElementById("btn-admin-console");
  if (adminBtn) adminBtn.style.display = isSuperAdmin ? "flex" : "none";

  const adminCta = document.getElementById("admin-panel-cta");
  if (adminCta) adminCta.style.display = isSuperAdmin ? "block" : "none";

  const navAdmin = document.getElementById("nav-admin");
  if (navAdmin) navAdmin.style.display = isSuperAdmin ? "flex" : "none";
}

async function openTeamAdminModal() {
  try {
    if (!currentTeam) {
      if (allTeams && allTeams.length > 0) {
        await selectTeam(allTeams[0]);
      } else {
        try {
          const res = await apiFetch("/team/my-teams");
          allTeams = res?.data || res?.teams || (Array.isArray(res) ? res : []);
          if (allTeams.length > 0) {
            await selectTeam(allTeams[0]);
          }
        } catch (e) {}
      }
    }

    const code = document.getElementById("t-admin-invite-code");
    if (code && currentTeam) {
      code.value = currentTeam.inviteCode || currentTeam.code || "";
    }

    populateTeamAdminMembers();
    openModal("modal-team-admin");
  } catch (err) {
    console.error("openTeamAdminModal error:", err);
    openModal("modal-team-admin");
  }
}

function switchTeamAdminTab(tabName, el) {
  document.querySelectorAll(".t-admin-tab").forEach(t => {
    t.classList.remove("active");
    t.style.background = "rgba(255,255,255,0.06)";
    t.style.color = "var(--clr-text-muted)";
  });
  document.querySelectorAll(".t-admin-panel").forEach(p => p.style.display = "none");

  el.classList.add("active");
  el.style.background = "var(--gradient)";
  el.style.color = "white";

  const panel = document.getElementById(`t-admin-tab-${tabName}`);
  if (panel) panel.style.display = "block";
}

function populateTeamAdminMembers() {
  const container = document.getElementById("t-admin-members-list");
  if (!container) return;
  const list = document.querySelectorAll("#members-list .member-item");
  container.innerHTML = "";
  if (!list || list.length === 0) {
    container.innerHTML = '<p style="font-size:0.8rem;color:var(--clr-text-dim);">No members found</p>';
    return;
  }
  list.forEach(item => {
    const name = item.querySelector(".member-name")?.innerText || "Member";
    const userId = item.dataset.userId;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--clr-surface-2);border-radius:8px;";
    row.innerHTML = `
      <span style="font-size:0.85rem;font-weight:600;">${escapeHtml(name)}</span>
      <div style="display:flex;gap:6px;">
        <button onclick="toggleTeamMemberRole('${userId}')" class="btn-secondary" style="padding:4px 8px;font-size:0.75rem;">Make Admin</button>
        <button onclick="removeTeamMember('${userId}')" class="btn-danger" style="padding:4px 8px;font-size:0.75rem;">Remove</button>
      </div>
    `;
    container.appendChild(row);
  });
}

function sendTeamBroadcast() {
  const msg = document.getElementById("t-admin-broadcast-msg").value.trim();
  if (!msg) return alert("Please enter announcement text.");
  apiFetch("/chat/send", { method: "POST", body: JSON.stringify({ teamId: currentTeam.id, content: `📢 Announcement: ${msg}` }) })
    .then(res => {
      document.getElementById("t-admin-broadcast-msg").value = "";
      renderMessage(res?.data || res, true);
      showToast("Team Broadcast", "Announcement sent to your team.", "success");
    })
    .catch(err => showToast("Error", err.message || "Could not send announcement.", "error"));
}

async function toggleTeamMemberRole(userId) {
  if (!currentTeam || !userId) return;
  try {
    await apiFetch(`/team/${currentTeam.id}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) });
    await loadMembers(currentTeam.id); populateTeamAdminMembers();
    showToast("Member updated", "Member is now a team admin.", "success");
  } catch (err) { showToast("Error", err.message || "Could not update role.", "error"); }
}

async function removeTeamMember(userId) {
  if (!currentTeam || !userId || !confirm("Remove this member from the team?")) return;
  try {
    await apiFetch(`/team/${currentTeam.id}/members/${userId}`, { method: "DELETE" });
    await loadMembers(currentTeam.id); populateTeamAdminMembers();
    showToast("Member removed", "The member no longer has team access.", "success");
  } catch (err) { showToast("Error", err.message || "Could not remove member.", "error"); }
}

function hideLoading() {
  const screen = document.getElementById("loading-screen");
  if (screen) {
    screen.classList.add("hidden");
    screen.style.display = "none";
    screen.style.pointerEvents = "none";
    screen.style.zIndex = "-1";
  }
  document.getElementById("app-shell").style.display = "grid";
}

// ==========================================
// SOCKET.IO
// ==========================================
// ==========================================
// SOCKET.IO
// ==========================================
function connectSocket() {
  if (typeof io === "undefined") {
    console.warn("Socket.io client library not loaded yet.");
    return;
  }
  socket = io(SOCKET_URL, {
    auth: { token: Auth.getToken() },
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    if (currentTeam) {
      socket.emit("joinRoom", currentTeam.id);
      socket.emit("join-team", currentTeam.id);
    }
  });

  socket.on("connect_error", (err) => {
    console.warn("Socket error:", err.message);
  });

  socket.on("disconnect", () => {
    console.warn("Socket disconnected");
  });

  // Chat & Notification events
  socket.off("newMessage").on("newMessage", handleNewMessage);
  socket.off("message-edited").on("message-edited", handleMessageEdited);
  socket.off("message-deleted").on("message-deleted", handleMessageDeleted);
  socket.off("notification").on("notification", (data) => {
    showToast(data?.title || "Group Notification", data?.content || "New group update", "info");
    fetchAndRenderNotifications();
  });
  socket.off("userTyping").on("userTyping", (data) => handleTypingEvent({ isTyping: true, userName: data?.userName || data?.name || "Someone", teamId: currentTeam?.id }));
  socket.off("userStoppedTyping").on("userStoppedTyping", () => handleTypingEvent({ isTyping: false }));

  // Presence
  socket.on("user-online", (userId) => { onlineUsers.add(userId); updateMembersUI(); });
  socket.on("user-offline", (userId) => { onlineUsers.delete(userId); updateMembersUI(); });

  // WebRTC signaling & Meeting Live Status
  socket.on("callOffer", handleIncomingCall);
  socket.on("call-offer", handleIncomingCall);
  socket.on("callAnswer", handleCallAnswer);
  socket.on("call-answer", handleCallAnswer);
  socket.on("iceCandidate", handleIceCandidate);
  socket.on("ice-candidate", handleIceCandidate);
  socket.on("call-rejected", () => { showToast("Call Declined", "The other user declined the call.", "info"); endCall(); });
  socket.on("userLeftCall", (data) => removePeer(data?.socketId || data?.userId || data));
  socket.on("user-left-call", (data) => removePeer(typeof data === "object" ? (data.socketId || data.userId) : data));
  socket.on("team-call-started", showTeamCallAlert);
  socket.on("team-call-ended", ({ teamId }) => {
    updateTeamLiveBadge(teamId, false);
    if (pendingTeamCall?.teamId === teamId) {
      pendingTeamCall = null;
      document.getElementById("incoming-call")?.classList.add("hidden");
    }
  });

  socket.on("meeting-status-changed", (data) => {
    if (!data?.teamId) return;
    updateTeamLiveBadge(data.teamId, data.isLive, data.participantCount);
  });

  socket.on("active-calls-list", ({ liveTeamIds }) => {
    liveMeetingTeams.clear();
    liveTeamIds?.forEach(id => liveMeetingTeams.add(String(id)));
    if (allTeams && allTeams.length > 0) renderTeams(allTeams);
    if (currentTeam) {
      updateTeamLiveBadge(currentTeam.id, liveMeetingTeams.has(String(currentTeam.id)));
    }
  });

  // Query live calls on connect
  socket.emit("get-active-calls");

  socket.on("callParticipants", ({ participants }) => {
    participants?.forEach(({ socketId, userId }) => {
      if (socketId && userId) {
        peerMeta[socketId] = { userId, name: getMemberName(userId) };
      }
    });
  });
  socket.on("userJoinedCall", async ({ socketId, userId }) => {
    if (!localStream || !socketId || socketId === socket.id) return;
    if (peers[socketId]) return;
    try {
      peerMeta[socketId] = { userId, name: getMemberName(userId) };
      const pc = createPeer(socketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("callOffer", { toSocketId: socketId, offer });
    } catch (err) { console.warn("Could not connect call participant", err); }
  });
  socket.on("message-reactions", ({ messageId, reactions }) => renderReactions(messageId, reactions));
}

// ==========================================
// TEAMS & LIVE MEETING BADGES
// ==========================================
const liveMeetingTeams = new Set();

function updateTeamLiveBadge(teamId, isLive, count = 1) {
  if (isLive) {
    liveMeetingTeams.add(String(teamId));
  } else {
    liveMeetingTeams.delete(String(teamId));
  }

  // Update Team Item in Sidebar
  const item = document.getElementById(`team-item-${teamId}`);
  if (item) {
    let badge = item.querySelector(".badge-live");
    if (isLive) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "badge-live";
        badge.innerHTML = `<span class="badge-live-dot"></span> LIVE`;
        item.appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  }

  // Update Chat Header Live Banner if currentTeam is active
  if (currentTeam && String(currentTeam.id) === String(teamId)) {
    const banner = document.getElementById("team-live-meeting-banner");
    const startCallBtn = document.getElementById("btn-start-call");
    if (banner) {
      banner.style.display = isLive ? "flex" : "none";
      const sub = document.getElementById("live-meeting-subtext");
      if (sub) sub.textContent = isLive ? `Meeting in progress with team members • Click Join to connect` : "";
    }
    if (startCallBtn) {
      if (isLive) {
        startCallBtn.innerHTML = `
          <span class="badge-live-dot" style="margin-right:4px;"></span>
          Join Meeting
        `;
        startCallBtn.style.background = "#ea4335";
      } else {
        startCallBtn.innerHTML = `
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          New meeting
        `;
        startCallBtn.style.background = "var(--clr-primary)";
      }
    }
  }
}

const teamUnreadCounts = {};

function updateTeamUnreadBadge(teamId, count) {
  const item = document.getElementById(`team-item-${teamId}`);
  if (!item) return;
  let badge = item.querySelector(".team-unread-badge");
  if (count > 0) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "team-unread-badge";
      badge.id = `team-unread-${teamId}`;
      item.appendChild(badge);
    }
    badge.textContent = count > 99 ? "99+" : count;
  } else if (badge) {
    badge.remove();
  }
}

async function loadTeams() {
  try {
    const res = await apiFetch("/team/my-teams");
    allTeams = res?.data || res?.teams || (Array.isArray(res) ? res : []);
    renderTeams(allTeams);
    if (allTeams.length > 0 && !currentTeam) {
      selectTeam(allTeams[0]);
    }
    if (socket && socket.connected) {
      allTeams.forEach(t => socket.emit("joinRoom", t.id));
      socket.emit("get-active-calls");
    }
  } catch (err) {
    console.error("loadTeams error:", err);
    showToast("Error", err?.message || "Could not load teams.", "error");
  }
}

function renderTeams(teams) {
  const list = document.getElementById("teams-list");
  const empty = document.getElementById("teams-empty");

  // Remove existing team items
  list.querySelectorAll(".team-item").forEach(el => el.remove());

  if (!teams || teams.length === 0) {
    empty.style.display = "flex";
    return;
  }
  empty.style.display = "none";

  teams.forEach(team => {
    const isLive = liveMeetingTeams.has(String(team.id));
    const liveBadgeHtml = isLive
      ? `<span class="badge-live"><span class="badge-live-dot"></span> LIVE</span>`
      : "";

    const unread = teamUnreadCounts[team.id] || 0;
    const unreadBadgeHtml = unread > 0
      ? `<span class="team-unread-badge" id="team-unread-${team.id}">${unread > 99 ? "99+" : unread}</span>`
      : "";

    const el = document.createElement("div");
    el.className = "team-item" + (currentTeam?.id === team.id ? " active" : "");
    el.id = `team-item-${team.id}`;
    el.onclick = () => selectTeam(team);

    const name = team.name || "Unnamed";
    const initials = name.substring(0, 2).toUpperCase();
    const colors = ["#7c3aed","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"];
    const color = colors[name.charCodeAt(0) % colors.length];

    el.innerHTML = `
      <div class="team-icon" style="background:${color};">${initials}</div>
      <div class="team-info">
        <div class="team-name">${escapeHtml(name)}</div>
        <div class="team-code">${team.inviteCode || team.code || ""}</div>
      </div>
      ${liveBadgeHtml}
      ${unreadBadgeHtml}
    `;
    list.appendChild(el);
  });
}

function filterTeams(query) {
  const q = query.toLowerCase();
  const filtered = allTeams.filter(t => (t.name || "").toLowerCase().includes(q));
  renderTeams(filtered);
}

async function selectTeam(team) {
  currentTeam = team;

  // Clear unread count for this team
  teamUnreadCounts[team.id] = 0;
  updateTeamUnreadBadge(team.id, 0);

  // Update active state
  document.querySelectorAll(".team-item").forEach(el => el.classList.remove("active"));
  const el = document.getElementById(`team-item-${team.id}`);
  if (el) el.classList.add("active");

  // Update header
  const name = team.name || "Unnamed";
  const initials = name.substring(0, 2).toUpperCase();
  document.getElementById("chat-team-name").textContent = name;
  document.getElementById("chat-team-icon").textContent = initials;
  document.getElementById("chat-team-meta").textContent = `Code: ${team.inviteCode || team.code || "N/A"}`;

  // Show chat
  document.getElementById("chat-welcome").style.display = "none";
  const chatActive = document.getElementById("chat-active");
  chatActive.style.display = "flex";

  // Check and update live meeting status
  const isLive = liveMeetingTeams.has(String(team.id));
  updateTeamLiveBadge(team.id, isLive);

  // Show call button
  const startCallBtn = document.getElementById("btn-start-call");
  if (startCallBtn) startCallBtn.style.display = "flex";

  // Join socket room
  if (socket) {
    socket.emit("joinRoom", team.id);
    socket.emit("join-team", team.id);
  }

  // Update Admin Console shortcut button & banner visibility
  updateAdminVisibility();

  // Load members + history
  await Promise.all([loadMembers(team.id), loadChatHistory(team.id)]);
  apiFetch(`/chat/${team.id}/read`, { method: "PATCH" }).catch(() => {});
}

// ==========================================
// MEMBERS
// ==========================================
async function loadMembers(teamId) {
  try {
    const res = await apiFetch(`/team/${teamId}/members`).catch(() => null);
    const members = res?.data || res?.members || (Array.isArray(res) ? res : []);
    renderMembers(members);
  } catch (err) {
    // Silently fail
  }
}

function renderMembers(members) {
  teamMembers = members || [];
  const list = document.getElementById("members-list");
  list.innerHTML = "";

  if (!members || members.length === 0) {
    list.innerHTML = '<p style="font-size:0.8rem;color:var(--clr-text-dim);padding:10px 0;">No members found</p>';
    return;
  }

  members.forEach(m => {
    const memberUser = m.User || m.user || m;
    const name = memberUser.name || memberUser.email || "Unknown";
    const ownerId = currentTeam?.ownerId || currentTeam?.createdBy;
    const isOwner = ownerId && (String(ownerId) === String(memberUser.id) || String(ownerId) === String(m.userId));
    const role = isOwner ? "admin" : (m.role || m.TeamMember?.role || "member");
    const isOnline = onlineUsers.has(String(memberUser.id));
    const initials = name.charAt(0).toUpperCase();

    const el = document.createElement("div");
    el.className = "member-item";
    el.id = `member-${memberUser.id}`;
    el.dataset.userId = memberUser.id;
    el.innerHTML = `
      <div class="member-status-wrapper">
        <div class="avatar avatar-sm" style="${isOwner ? 'border:1.5px solid #f59e0b;' : ''}">${initials}</div>
        <div class="${isOnline ? "online-dot" : "offline-dot"}"></div>
      </div>
      <div class="member-info">
        <div class="member-name" style="display:flex;align-items:center;gap:4px;">
          ${escapeHtml(name)}
          ${isOwner || role === 'admin' ? '<span style="font-size:0.62rem;background:rgba(245,158,11,0.2);color:#fcd34d;border:1px solid rgba(245,158,11,0.4);border-radius:4px;padding:1px 5px;font-weight:800;">👑 Admin</span>' : ''}
        </div>
        <div class="member-role" style="color:${isOwner || role === 'admin' ? '#fcd34d' : 'var(--clr-text-dim)'};">${isOwner ? 'Team Owner' : role}</div>
      </div>
    `;
    list.appendChild(el);
  });
}

function getMemberName(userId) {
  if (!userId) return "Member";
  const match = teamMembers.find((m) => {
    const memberUser = m.User || m.user || m;
    return String(memberUser.id || m.userId) === String(userId);
  });
  if (match) {
    const memberUser = match.User || match.user || match;
    return memberUser.name || memberUser.email || "Member";
  }
  return "Member";
}

function resolvePeerSocketId(id) {
  if (!id) return null;
  if (peers[id]) return id;
  return Object.keys(peerMeta).find((socketId) => String(peerMeta[socketId]?.userId) === String(id)) || null;
}

function updateMembersUI() {
  document.querySelectorAll(".member-item").forEach(el => {
    const id = el.id.replace("member-", "");
    const dot = el.querySelector("[class$='-dot']");
    if (dot) {
      dot.className = onlineUsers.has(id) ? "online-dot" : "offline-dot";
    }
  });
}

// ==========================================
// CHAT HISTORY
// ==========================================
async function loadChatHistory(teamId) {
  const area = document.getElementById("messages-area");
  area.innerHTML = '<div style="text-align:center;color:var(--clr-text-dim);font-size:0.8rem;padding:20px;">Loading messages...</div>';

  try {
    const res = await apiFetch(`/chat/${teamId}/history`);
    const messages = res?.data || res?.messages || (Array.isArray(res) ? res : []);
    area.innerHTML = "";

    if (messages.length === 0) {
      area.innerHTML = '<div class="msg-day-divider">No messages yet. Say hi! 👋</div>';
      return;
    }

    messages.forEach(msg => renderMessage(msg, false));
    scrollToBottom();
  } catch (err) {
    area.innerHTML = '<div style="text-align:center;color:var(--clr-text-dim);font-size:0.8rem;padding:20px;">Could not load messages.</div>';
  }
}

// ==========================================
// RENDER MESSAGE
// ==========================================
function renderMessage(msg, scroll = true, targetAreaId = "messages-area") {
  if (!msg) return;
  const area = document.getElementById(targetAreaId);
  if (!area) return;
  if (msg.id && area.querySelector(`#msg-${msg.id}`)) return;
  const currentUser = Auth.getUser() || user;
  const myId = String(currentUser.id || currentUser.userId);
  const senderObj = msg.sender || msg.User || {};
  const senderId = String(msg.senderId || msg.userId || senderObj.id);
  const isOwn = senderId === myId;

  let senderName = senderObj.name || msg.senderName;
  if (!senderName || isOwn) {
    senderName = isOwn ? (currentUser.name || "You") : (senderName || "Teammate");
  }

  const senderPic = isOwn ? (currentUser.profilePic || senderObj.profilePic) : senderObj.profilePic;
  const initials = senderName.charAt(0).toUpperCase();

  const time = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const el = document.createElement("div");
  el.className = `msg${isOwn ? " own" : ""}`;
  if (msg.id) el.id = `msg-${msg.id}`;

  const avatarContent = senderPic 
    ? `<img src="${senderPic.startsWith('http') ? senderPic : SOCKET_URL + (senderPic.startsWith('/') ? '' : '/') + senderPic}" class="avatar avatar-sm" style="object-fit:cover;border-radius:50%;" />`
    : `<div class="avatar avatar-sm">${initials}</div>`;

  const avatarHtml = `<div class="msg-avatar">${avatarContent}</div>`;

  let contentHtml = "";
  if (msg.fileUrl || msg.type === "file") {
    const fileName = msg.fileName || msg.content || "Attachment";
    const fileUrl = msg.fileUrl ? (msg.fileUrl.startsWith('http') ? msg.fileUrl : `${SOCKET_URL}${msg.fileUrl.startsWith('/') ? '' : '/'}${msg.fileUrl}`) : "#";
    contentHtml = `
      <a class="msg-file" href="${fileUrl}" target="_blank" download>
        <div class="msg-file-icon">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        </div>
        <div>
          <div class="msg-file-name">${escapeHtml(fileName)}</div>
          <div class="msg-file-size">Click to download</div>
        </div>
      </a>
    `;
  } else {
    contentHtml = `<div class="msg-bubble">${escapeHtml(msg.content || "")}</div>`;
  }

  const actionsHtml = `
    <div class="msg-actions">
      <button class="btn-icon" title="Reply in Thread" onclick="setReplyMessage('${msg.id}', \`${escapeHtml(senderName)}\`, \`${escapeHtml(msg.content || 'File')}\`)" style="width:26px;height:26px;color:var(--clr-text-dim);">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
      </button>
      <div style="position:relative;display:inline-block;">
        <button class="btn-icon" title="React" onclick="toggleReactionPicker('${msg.id}')" style="width:26px;height:26px;color:var(--clr-text-dim);">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
        <div id="picker-${msg.id}" style="display:none;position:absolute;bottom:30px;left:0;background:var(--clr-surface-2);border:1px solid var(--clr-border);border-radius:20px;padding:4px 8px;gap:8px;z-index:30;box-shadow:0 6px 20px rgba(0,0,0,0.4);">
          <span onclick="addEmojiReaction('${msg.id}','👍')" style="cursor:pointer;font-size:0.9rem;">👍</span>
          <span onclick="addEmojiReaction('${msg.id}','❤️')" style="cursor:pointer;font-size:0.9rem;">❤️</span>
          <span onclick="addEmojiReaction('${msg.id}','😂')" style="cursor:pointer;font-size:0.9rem;">😂</span>
          <span onclick="addEmojiReaction('${msg.id}','🔥')" style="cursor:pointer;font-size:0.9rem;">🔥</span>
          <span onclick="addEmojiReaction('${msg.id}','🎉')" style="cursor:pointer;font-size:0.9rem;">🎉</span>
        </div>
      </div>
      ${isOwn && msg.id ? `
        <button class="btn-icon" onclick="editMessage('${msg.id}', \`${escapeHtml(msg.content || "")}\`)" style="width:26px;height:26px;">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </button>
        <button class="btn-icon" onclick="deleteMessage('${msg.id}')" style="width:26px;height:26px;color:var(--clr-danger);">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      ` : ""}
    </div>
  `;

  el.innerHTML = `
    ${!isOwn ? avatarHtml : ""}
    <div class="msg-content">
      <div class="msg-meta" style="margin-bottom:3px;display:flex;align-items:center;gap:6px;">
        <span class="msg-author" style="font-size:0.75rem;font-weight:700;color:${isOwn ? 'var(--clr-primary-light)' : 'var(--clr-accent)'};">${escapeHtml(senderName)}</span>
        <span class="msg-time" style="font-size:0.7rem;color:var(--clr-text-dim);">${time}</span>
      </div>
      <div class="msg-body-row" style="display:flex;align-items:center;gap:6px;${isOwn ? 'flex-direction:row-reverse;' : ''}">
        ${contentHtml}
        ${actionsHtml}
      </div>
    </div>
    ${isOwn ? avatarHtml : ""}
  `;

  area.appendChild(el);
  renderReactions(msg.id, msg.reactions || []);
  if (scroll) scrollToBottom();
}

let currentReplyMessage = null;

function setReplyMessage(msgId, senderName, contentSnippet) {
  currentReplyMessage = { id: msgId, name: senderName, text: contentSnippet };
  const banner = document.getElementById("reply-banner");
  const text = document.getElementById("reply-text");
  if (banner && text) {
    text.textContent = `Replying to ${senderName}: "${contentSnippet.substring(0, 40)}${contentSnippet.length > 40 ? '...' : ''}"`;
    banner.style.display = "flex";
  }
  document.getElementById("chat-input").focus();
}

function cancelReply() {
  currentReplyMessage = null;
  const banner = document.getElementById("reply-banner");
  if (banner) banner.style.display = "none";
}

function toggleReactionPicker(msgId) {
  const p = document.getElementById(`picker-${msgId}`);
  if (!p) return;
  const actions = p.closest('.msg-actions');
  const isShowing = p.style.display === "flex";
  p.style.display = isShowing ? "none" : "flex";
  if (actions) {
    if (isShowing) actions.classList.remove('show-actions');
    else actions.classList.add('show-actions');
  }
}

function addEmojiReaction(msgId, emoji) {
  const picker = document.getElementById(`picker-${msgId}`);
  if (picker) {
    picker.style.display = "none";
    const actions = picker.closest('.msg-actions');
    if (actions) actions.classList.remove('show-actions');
  }
  apiFetch(`/chat/${msgId}/reactions`, { method: "POST", body: JSON.stringify({ emoji }) })
    .then(res => renderReactions(msgId, res?.data?.reactions || []))
    .catch(err => showToast("Error", err.message || "Could not add reaction.", "error"));
}

function renderReactions(msgId, reactions) {
  const el = document.getElementById(`msg-${msgId}`);
  if (!el) return;
  let box = el.querySelector(".msg-reactions");
  if (!box) {
    box = document.createElement("div");
    box.className = "msg-reactions";
    box.style.cssText = "display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;";
    el.querySelector(".msg-content").appendChild(box);
  }
  const grouped = reactions.reduce((out, reaction) => { out[reaction.emoji] = (out[reaction.emoji] || 0) + 1; return out; }, {});
  box.innerHTML = Object.entries(grouped).map(([emoji, count]) => `<button onclick="addEmojiReaction('${msgId}','${emoji}')" style="background:rgba(124,58,237,0.25);border:1px solid rgba(124,58,237,0.45);border-radius:12px;padding:2px 8px;font-size:0.85rem;cursor:pointer;color:white;">${emoji} <span style="font-weight:700;font-size:0.75rem;">${count}</span></button>`).join("");
  box.style.display = Object.keys(grouped).length ? "flex" : "none";
}

function filterChatMessages(query) {
  const q = query.toLowerCase().trim();
  const messages = document.querySelectorAll("#messages-area .msg");
  messages.forEach(el => {
    const text = el.textContent.toLowerCase();
    if (!q || text.includes(q)) {
      el.style.display = "flex";
    } else {
      el.style.display = "none";
    }
  });
}

function scrollToBottom() {
  const area = document.getElementById("messages-area");
  area.scrollTop = area.scrollHeight;
}

// ==========================================
// SEND MESSAGE
// ==========================================
async function sendMessage() {
  const input = document.getElementById("chat-input");
  const content = input.value.trim();
  if (!content || !currentTeam) return;

  input.value = "";
  autoResizeTextarea(input);
  stopTyping();

  try {
    const res = await apiFetch("/chat/send", {
      method: "POST",
      body: JSON.stringify({ teamId: currentTeam.id, content, replyToId: currentReplyMessage?.id || null }),
    });

    const msg = res?.data || res;
    if (msg && (msg.id || msg.content)) {
      renderMessage(msg, true);
      renderMessage(msg, true, "call-messages-area");
    }
    cancelReply();
  } catch (err) {
    showToast("Error", "Could not send message.", "error");
  }
}

function handleNewMessage(msg) {
  const currentUserId = (Auth.getUser() || user)?.id;
  const isOwn = String(msg.senderId) === String(currentUserId);
  const targetTeam = allTeams.find(t => String(t.id) === String(msg.teamId));
  const teamName = targetTeam?.name || "Team";
  const senderName = msg.sender?.name || (getMemberName(msg.senderId) || "Teammate");

  // Check if current user is @mentioned
  const userName = (Auth.getUser() || user)?.name || "";
  const isMentioned = !isOwn && userName && msg.content && msg.content.toLowerCase().includes(`@${userName.toLowerCase()}`);

  if (currentTeam && (String(msg.teamId) === String(currentTeam.id))) {
    renderMessage(msg, true);
    renderMessage(msg, true, "call-messages-area");
    if (!isOwn) {
      apiFetch(`/chat/${currentTeam.id}/read`, { method: "PATCH" }).catch(() => {});
      if (isMentioned) {
        showToast(`🏷️ @Mention from ${senderName}`, msg.content || "Mentioned you in chat", "info");
        fetchAndRenderNotifications();
      }
    }
  } else {
    // Message received in another team
    if (!isOwn) {
      teamUnreadCounts[msg.teamId] = (teamUnreadCounts[msg.teamId] || 0) + 1;
      updateTeamUnreadBadge(msg.teamId, teamUnreadCounts[msg.teamId]);
      
      if (isMentioned) {
        showToast(`🏷️ @Mention in ${teamName}`, `${senderName}: ${msg.content}`, "info");
      } else {
        showToast(`💬 Message in ${teamName}`, `${senderName}: ${msg.content || "Sent a file"}`, "info");
      }
      fetchAndRenderNotifications();
    }
  }
}

// ==========================================
// EDIT / DELETE MESSAGE
// ==========================================
async function editMessage(msgId, currentContent) {
  const newContent = prompt("Edit message:", currentContent);
  if (!newContent || newContent === currentContent) return;

  try {
    await apiFetch(`/chat/${msgId}`, {
      method: "PATCH",
      body: JSON.stringify({ content: newContent }),
    });
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      const bubble = el.querySelector(".msg-bubble");
      if (bubble) bubble.textContent = newContent;
    }
  } catch (err) {
    showToast("Error", "Could not edit message.", "error");
  }
}

async function deleteMessage(msgId) {
  if (!confirm("Delete this message?")) return;
  try {
    await apiFetch(`/chat/${msgId}`, { method: "DELETE" });
    const el = document.getElementById(`msg-${msgId}`);
    if (el) el.remove();
  } catch (err) {
    showToast("Error", "Could not delete message.", "error");
  }
}

function handleMessageEdited(data) {
  const el = document.getElementById(`msg-${data.id}`);
  if (el) {
    const bubble = el.querySelector(".msg-bubble");
    if (bubble) bubble.textContent = data.content;
  }
}

function handleMessageDeleted(data) {
  const el = document.getElementById(`msg-${data.id || data}`);
  if (el) el.remove();
}

// ==========================================
// FILE UPLOAD
// ==========================================
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file || !currentTeam) return;
  event.target.value = "";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("teamId", currentTeam.id);

  showToast("Uploading", `Sending ${file.name}...`, "info");
  try {
    const res = await fetch(`${API}/chat/send-file`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Auth.getToken()}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    const msg = json?.data || json;
    if (msg && msg.id) {
      renderMessage(msg, true);
    }
    showToast("Sent", "File sent!", "success");
  } catch (err) {
    showToast("Error", "File upload failed.", "error");
  }
}

// ==========================================
// TYPING INDICATOR
// ==========================================
function handleTypingInput() {
  const input = document.getElementById("chat-input");
  autoResizeTextarea(input);
  if (!currentTeam || !socket) return;

  if (!isTyping) {
    isTyping = true;
    socket.emit("typing-start", { teamId: currentTeam.id });
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 2000);
}

function stopTyping() {
  if (isTyping && socket && currentTeam) {
    isTyping = false;
    socket.emit("typing-stop", { teamId: currentTeam.id });
  }
  clearTimeout(typingTimer);
}

function handleTypingEvent(data) {
  if (!currentTeam || data.teamId !== currentTeam.id) return;
  const indicator = document.getElementById("typing-indicator");
  const text = document.getElementById("typing-text");
  if (data.isTyping) {
    text.textContent = `${data.userName || "Someone"} is typing...`;
    indicator.style.display = "flex";
  } else {
    indicator.style.display = "none";
  }
}

// ==========================================
// CHAT KEYDOWN
// ==========================================
function handleChatKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

// ==========================================
// CREATE / JOIN / LEAVE TEAM
// ==========================================
async function createTeam() {
  const nameInput = document.getElementById("new-team-name");
  const name = nameInput ? nameInput.value.trim() : "";
  if (!name) return showToast("Error", "Team name is required.", "error");

  setModalLoading("btn-create-team", true);
  try {
    const res = await apiFetch("/team/create", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    closeModal("modal-create-team");
    if (nameInput) nameInput.value = "";
    
    const newTeam = res?.data || res?.team || res;
    const inviteCode = newTeam?.inviteCode || newTeam?.code || "";
    showToast("✅ Team Created!", `"${name}" is ready!${inviteCode ? " Code: " + inviteCode : ""}`, "success");
    await loadTeams();
    if (newTeam && (newTeam.id || newTeam._id)) {
      selectTeam(newTeam);
    }
  } catch (err) {
    showToast("Error", err.message || "Could not create team.", "error");
  } finally {
    setModalLoading("btn-create-team", false);
  }
}

async function joinTeam() {
  const code = document.getElementById("join-team-code").value.trim().toUpperCase();
  if (!code) return showToast("Error", "Please enter an invite code.", "error");

  setModalLoading("btn-join-team", true);
  try {
    await apiFetch("/team/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: code }),
    });
    closeModal("modal-join-team");
    document.getElementById("join-team-code").value = "";
    showToast("Joined!", "You joined the team successfully.", "success");
    await loadTeams();
  } catch (err) {
    showToast("Error", err.message || "Could not join team.", "error");
  } finally {
    setModalLoading("btn-join-team", false);
  }
}

function leaveCurrentTeam(e) {
  if (e && e.stopPropagation) {
    e.stopPropagation();
    e.preventDefault();
  }
  if (!currentTeam) {
    showToast("Select Team", "Please select a team first.", "info");
    return;
  }
  const msgEl = document.getElementById("leave-team-msg");
  if (msgEl) {
    msgEl.innerHTML = `Are you sure you want to leave <strong>"${currentTeam.name}"</strong>? You will lose access to its messages.`;
  }
  openModal("modal-leave-team-confirm");
}

async function confirmLeaveTeamAction(e) {
  if (e && e.stopPropagation) {
    e.stopPropagation();
    e.preventDefault();
  }
  if (!currentTeam) {
    closeModal("modal-leave-team-confirm");
    return;
  }
  const btn = document.getElementById("btn-confirm-leave-team");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Leaving...";
  }

  try {
    await apiFetch(`/team/${currentTeam.id}/leave`, { method: "DELETE" });
    showToast("Left Team", `You left "${currentTeam.name}".`, "info");
    currentTeam = null;
    const welcome = document.getElementById("chat-welcome");
    if (welcome) welcome.style.display = "flex";
    const active = document.getElementById("chat-active");
    if (active) active.style.display = "none";
    const startCallBtn = document.getElementById("btn-start-call");
    if (startCallBtn) startCallBtn.style.display = "none";
    closeModal("modal-leave-team-confirm");
    closeModal("modal-team-admin");
    await loadTeams();
  } catch (err) {
    showToast("Error", err.message || "Could not leave team.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Leave Team";
    }
    closeModal("modal-leave-team-confirm");
  }
}

async function deleteCurrentTeam() {
  if (!currentTeam) return;
  if (!confirm(`Are you sure you want to permanently delete team "${currentTeam.name}" for all members?`)) return;

  try {
    await apiFetch(`/team/${currentTeam.id}`, { method: "DELETE" });
    showToast("Team Deleted", `Team "${currentTeam.name}" was deleted.`, "info");
  } catch (err) {
    showToast("Error", err.message || "Could not delete team.", "error");
    return;
  }

  currentTeam = null;
  const welcome = document.getElementById("chat-welcome");
  if (welcome) welcome.style.display = "flex";
  const active = document.getElementById("chat-active");
  if (active) active.style.display = "none";
  const startCallBtn = document.getElementById("btn-start-call");
  if (startCallBtn) startCallBtn.style.display = "none";
  closeModal("modal-team-admin");
  await loadTeams();
}

// ==========================================
// VIDEO CALL — WebRTC
// ==========================================
function createSyntheticStream() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  function draw() {
    ctx.fillStyle = "#0e0e1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 640, 480);
    gradient.addColorStop(0, "#7c3aed");
    gradient.addColorStop(1, "#3b82f6");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(320, 240, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial, 320, 240);

    requestAnimationFrame(draw);
  }
  draw();

  return canvas.captureStream(30);
}

// ============ LOBBY — Google Meet style pre-join screen ============
let lobbyMicEnabled = true;
let lobbyCamEnabled = true;
let lobbyStream = null;

async function showLobby() {
  if (!currentTeam) {
    showToast("Select Team", "Please select a team first to start a video call.", "info");
    return;
  }
  const lobby = document.getElementById("call-lobby");
  if (!lobby) { await startCall(); return; }
  document.getElementById("lobby-call-title").textContent = "Ready to join?";
  document.getElementById("lobby-call-subtitle").textContent = currentTeam.name;
  lobby.classList.remove("hidden");
  try {
    lobbyStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const vid = document.getElementById("lobby-preview-video");
    if (vid) { vid.srcObject = lobbyStream; }
    document.getElementById("lobby-no-cam")?.classList.add("hidden");
    lobbyCamEnabled = true; lobbyMicEnabled = true;
  } catch {
    document.getElementById("lobby-no-cam")?.classList.remove("hidden");
    lobbyCamEnabled = false;
  }
}

function toggleLobbyMic() {
  lobbyMicEnabled = !lobbyMicEnabled;
  if (lobbyStream) lobbyStream.getAudioTracks().forEach(t => t.enabled = lobbyMicEnabled);
  const btn = document.getElementById("lobby-mic-btn");
  if (btn) btn.classList.toggle("muted", !lobbyMicEnabled);
}

function toggleLobbyCam() {
  lobbyCamEnabled = !lobbyCamEnabled;
  if (lobbyStream) lobbyStream.getVideoTracks().forEach(t => t.enabled = lobbyCamEnabled);
  const btn = document.getElementById("lobby-cam-btn");
  if (btn) btn.classList.toggle("muted", !lobbyCamEnabled);
  document.getElementById("lobby-no-cam")?.classList.toggle("hidden", lobbyCamEnabled);
}

async function joinCallFromLobby() {
  document.getElementById("call-lobby")?.classList.add("hidden");
  if (lobbyStream) { localStream = lobbyStream; lobbyStream = null; }
  await startCall(true, true);
}

function cancelLobby() {
  document.getElementById("call-lobby")?.classList.add("hidden");
  if (lobbyStream) { lobbyStream.getTracks().forEach(t => t.stop()); lobbyStream = null; }
}

function switchCallPanel(tab, el) {
  document.querySelectorAll(".call-chat-tab").forEach(t => t.classList.remove("active"));
  if (el) el.classList.add("active");
  const chatContent = document.getElementById("call-chat-tab-content");
  const peopleContent = document.getElementById("call-people-tab-content");
  const panelTitle = document.getElementById("call-panel-title");
  if (tab === "chat") {
    if (chatContent) chatContent.style.display = "";
    if (peopleContent) peopleContent.style.display = "none";
    if (panelTitle) panelTitle.textContent = "In-call messages";
  } else {
    if (chatContent) chatContent.style.display = "none";
    if (peopleContent) peopleContent.style.display = "";
    if (panelTitle) panelTitle.textContent = "People";
    renderCallParticipants();
  }
}

function renderCallParticipants() {
  const list = document.getElementById("call-participants-list");
  if (!list || !currentTeam) return;
  const members = currentTeam.members || [];
  list.innerHTML = members.map(m => `
    <div class="call-participant-item">
      <div class="avatar avatar-sm">${(m.name||m.email||"?").charAt(0).toUpperCase()}</div>
      <span style="font-size:0.84rem;flex:1;">${m.name||m.email}</span>
      <div class="call-participant-icons">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--clr-success)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
      </div>
    </div>`).join("");
}

function toggleCallPeople() {
  const panel = document.getElementById("call-chat-panel");
  if (!panel) return;
  const hidden = panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !hidden);
  if (hidden) switchCallPanel("people", document.querySelectorAll(".call-chat-tab")[1]);
}
// ============ END LOBBY ============

async function startCall(announce = true, skipMediaSetup = false) {
  if (!currentTeam) {
    showToast("Select Team", "Please select a team first to start a video call.", "info");
    return;
  }

  if (!skipMediaSetup) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err2) {
        console.warn("Camera/Mic hardware not accessible, using fallback video stream.");
        localStream = createSyntheticStream();
      }
    }
  }

  openCallOverlay();
  addVideoTile(localStream, user.name || user.email || "You", true);

  const nameDisplay = document.getElementById("call-name-display");
  if (nameDisplay) nameDisplay.textContent = currentTeam.name;

  if (socket) {
    socket.emit("joinCall", { teamId: currentTeam.id });
    if (announce) socket.emit("call-start", {
      teamId: currentTeam.id,
      teamName: currentTeam.name,
      callerName: user.name || user.email || "Someone",
    });
  }
  activeCallTeamId = currentTeam.id;
  document.getElementById("call-title").textContent = currentTeam.name;
}

function handleIncomingCall(data) {
  if (data?.offer) {
    (async () => {
      try {
        if (!localStream) await startCall(false);
        const from = data.fromSocketId || data.from;
        if (peers[from]) return;
        if (data.fromUserId) {
          peerMeta[from] = { userId: data.fromUserId, name: getMemberName(data.fromUserId) };
        }
        const pc = createPeer(from);
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("callAnswer", { toSocketId: from, answer });
      } catch (err) { showToast("Call error", "Could not join the video call.", "error"); }
    })();
    return;
  }
  pendingCallData = data;
  document.getElementById("incoming-caller-name").textContent = data.callerName || "Someone";
  document.getElementById("incoming-call").classList.remove("hidden");
}

function showTeamCallAlert(data) {
  if (!data?.teamId || activeCallTeamId === data.teamId) return;
  pendingTeamCall = data;
  pendingCallData = null;
  const title = document.getElementById("incoming-caller-name");
  const subtitle = document.querySelector("#incoming-call .incoming-call-text p");
  if (title) title.textContent = `${data.callerName || "A teammate"} started a meeting`;
  if (subtitle) subtitle.textContent = `${data.teamName || "Team"} • Join video call now`;
  document.getElementById("incoming-call").classList.remove("hidden");
  showToast("Video meeting started", `${data.teamName || "Your team"} has an active call.`, "info");
}

async function acceptCall() {
  document.getElementById("incoming-call").classList.add("hidden");
  if (pendingTeamCall) {
    const call = pendingTeamCall;
    pendingTeamCall = null;
    const team = allTeams.find(item => String(item.id) === String(call.teamId));
    if (!team) return showToast("Call unavailable", "You are no longer a member of this team.", "error");
    await selectTeam(team);
    return startCall(false);
  }
  if (!pendingCallData) return;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    showToast("Camera Error", "Could not access camera/microphone.", "error");
    return;
  }

  openCallOverlay();
  addVideoTile(localStream, user.name || "You", true);

  // Create peer for caller
  const pc = createPeer(pendingCallData.callerId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("call-offer", {
    to: pendingCallData.callerId,
    offer,
    callerName: user.name || "Someone",
  });
}

function rejectCall() {
  document.getElementById("incoming-call").classList.add("hidden");
  if (pendingTeamCall) { pendingTeamCall = null; return; }
  if (pendingCallData) {
    socket.emit("call-reject", { to: pendingCallData.callerId });
    pendingCallData = null;
  }
}

async function handleCallAnswer(data) {
  const pc = peers[data.from] || peers[data.fromSocketId];
  if (!pc) return;
  await pc.setRemoteDescription(data.answer);
}

async function handleIceCandidate(data) {
  const pc = peers[data.from] || peers[data.fromSocketId];
  if (!pc) return;
  try {
    await pc.addIceCandidate(data.candidate);
  } catch (e) { /* ignore */ }
}

function createPeer(socketId) {
  if (peers[socketId]) {
    peers[socketId].close();
    delete peers[socketId];
  }

  const pc = new RTCPeerConnection(ICE_SERVERS);
  peers[socketId] = pc;

  localStream?.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("ice-candidate", { to: socketId, candidate: e.candidate });
    }
  };

  const remoteStream = new MediaStream();
  pc.ontrack = (e) => {
    if (!remoteStream.getTracks().find((t) => t.id === e.track.id)) {
      remoteStream.addTrack(e.track);
    }
    const name = peerMeta[socketId]?.name || getMemberName(peerMeta[socketId]?.userId) || "Member";
    addOrUpdateVideoTile(socketId, remoteStream, name, false);
  };

  return pc;
}

function removePeer(id) {
  const socketId = resolvePeerSocketId(id) || id;
  if (peers[socketId]) {
    peers[socketId].close();
    delete peers[socketId];
  }
  delete peerMeta[socketId];

  const tile = document.getElementById(`tile-${socketId}`);
  if (tile) tile.remove();

  if (pinnedTileId === socketId) unpinVideo();
  else if (pinnedTileId) renderSpotlight();

  updateCallGrid();
}

function openCallOverlay() {
  document.getElementById("call-overlay").classList.remove("hidden");
  document.getElementById("call-videos").innerHTML = "";
  document.getElementById("call-videos").classList.remove("hidden");
  document.getElementById("call-spotlight").classList.add("hidden");
  pinnedTileId = null;
  const unpinBtn = document.getElementById("btn-unpin-video");
  if (unpinBtn) unpinBtn.style.display = "none";
  syncCallChat();
  startCallTimer();
}

function addOrUpdateVideoTile(tileId, stream, label, isLocal) {
  const container = document.getElementById("call-videos");
  const id = isLocal ? "local" : tileId;
  let tile = document.getElementById(`tile-${id}`);

  if (tile) {
    const video = tile.querySelector("video");
    if (video && video.srcObject !== stream) video.srcObject = stream;
    const labelEl = tile.querySelector(".video-tile-label");
    if (labelEl) labelEl.innerHTML = `${isLocal ? "🟢" : "👤"} ${escapeHtml(label)}`;
    if (pinnedTileId) renderSpotlight();
    return;
  }

  tile = document.createElement("div");
  tile.className = `video-tile${isLocal ? " local" : ""}`;
  tile.id = `tile-${id}`;

  const video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  if (isLocal) video.muted = true;

  tile.innerHTML = `
    <div class="video-tile-pin-hint">Click for fullscreen</div>
    <div class="video-tile-label">${isLocal ? "🟢" : "👤"} ${escapeHtml(label)}</div>
  `;
  tile.insertBefore(video, tile.firstChild);

  if (!isLocal) {
    tile.onclick = () => pinVideo(id);
  } else {
    tile.onclick = () => pinVideo("local");
  }

  container.appendChild(tile);
  updateCallGrid();
}

function addVideoTile(stream, label, isLocal) {
  addOrUpdateVideoTile(isLocal ? "local" : label, stream, label, isLocal);
}

function pinVideo(tileId) {
  if (pinnedTileId === tileId) {
    unpinVideo();
    return;
  }
  pinnedTileId = tileId;
  document.getElementById("call-videos").classList.add("hidden");
  document.getElementById("call-spotlight").classList.remove("hidden");
  const unpinBtn = document.getElementById("btn-unpin-video");
  if (unpinBtn) unpinBtn.style.display = "inline-flex";
  renderSpotlight();
}

function unpinVideo() {
  pinnedTileId = null;
  document.getElementById("call-videos").classList.remove("hidden");
  document.getElementById("call-spotlight").classList.add("hidden");
  const unpinBtn = document.getElementById("btn-unpin-video");
  if (unpinBtn) unpinBtn.style.display = "none";
}

function renderSpotlight() {
  const main = document.getElementById("spotlight-main");
  const strip = document.getElementById("spotlight-strip");
  if (!main || !strip || !pinnedTileId) return;

  main.innerHTML = "";
  strip.innerHTML = "";

  document.querySelectorAll("#call-videos .video-tile").forEach((tile) => {
    const id = tile.id.replace("tile-", "");
    const sourceVideo = tile.querySelector("video");
    if (!sourceVideo?.srcObject) return;

    const label = tile.querySelector(".video-tile-label")?.textContent?.trim() || "Member";
    const video = document.createElement("video");
    video.srcObject = sourceVideo.srcObject;
    video.autoplay = true;
    video.playsInline = true;
    if (id === "local") video.muted = true;

    if (id === pinnedTileId) {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position:relative;width:100%;height:100%;";
      video.style.cssText = "width:100%;height:100%;object-fit:contain;background:#000;";
      const labelEl = document.createElement("div");
      labelEl.className = "video-tile-label";
      labelEl.textContent = label;
      wrapper.appendChild(video);
      wrapper.appendChild(labelEl);
      main.appendChild(wrapper);
    } else {
      const thumb = document.createElement("div");
      thumb.className = "spotlight-thumb";
      thumb.onclick = () => pinVideo(id);
      thumb.appendChild(video);
      strip.appendChild(thumb);
    }
  });
}

function toggleCallChat() {
  callChatOpen = !callChatOpen;
  const panel = document.getElementById("call-chat-panel");
  const btn = document.getElementById("btn-toggle-call-chat");
  if (panel) panel.classList.toggle("hidden", !callChatOpen);
  if (btn) btn.textContent = callChatOpen ? "💬 Hide Chat" : "💬 Chat";
  if (callChatOpen) syncCallChat();
}

function syncCallChat() {
  const mainArea = document.getElementById("messages-area");
  const callArea = document.getElementById("call-messages-area");
  if (!mainArea || !callArea) return;
  callArea.innerHTML = mainArea.innerHTML;
  callArea.scrollTop = callArea.scrollHeight;
}

function handleCallChatKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendCallMessage();
  }
}

async function sendCallMessage() {
  const input = document.getElementById("call-chat-input");
  const content = input?.value.trim();
  if (!content || !currentTeam) return;

  input.value = "";
  try {
    const res = await apiFetch("/chat/send", {
      method: "POST",
      body: JSON.stringify({ teamId: currentTeam.id, content }),
    });
    const msg = res?.data || res;
    if (msg && (msg.id || msg.content)) {
      renderMessage(msg, true);
      renderMessage(msg, true, "call-messages-area");
    }
  } catch (err) {
    showToast("Error", "Could not send message.", "error");
  }
}

function updateCallGrid() {
  const container = document.getElementById("call-videos");
  const count = container.children.length;
  container.className = `call-videos ${count <= 1 ? "one" : count === 2 ? "two" : count === 3 ? "three" : "four"}`;
}

function endCall() {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  Object.values(peers).forEach(pc => pc.close());
  peers = {};
  stopCallTimer();
  document.getElementById("call-overlay").classList.add("hidden");
  document.getElementById("call-videos").innerHTML = "";

  if (currentTeam && socket) {
    socket.emit("leaveCall", { teamId: currentTeam.id });
  }
  activeCallTeamId = null;
}

function toggleMic() {
  if (!localStream) return;
  isMicOn = !isMicOn;
  localStream.getAudioTracks().forEach(t => t.enabled = isMicOn);
  document.getElementById("ctrl-mic").classList.toggle("active", !isMicOn);
}

function toggleVideo() {
  if (!localStream) return;
  isVideoOn = !isVideoOn;
  localStream.getVideoTracks().forEach(t => t.enabled = isVideoOn);
  document.getElementById("ctrl-video").classList.toggle("active", !isVideoOn);
}

async function toggleScreenShare() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const videoTrack = screenStream.getVideoTracks()[0];
    Object.values(peers).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender) sender.replaceTrack(videoTrack);
    });
    videoTrack.onended = () => {
      // Switch back to camera
      if (localStream) {
        const cameraTrack = localStream.getVideoTracks()[0];
        Object.values(peers).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
        });
      }
    };
    document.getElementById("ctrl-screen").classList.add("active");
    showToast("Screen Sharing", "Screen share started.", "info");
  } catch (err) {
    showToast("Error", "Screen share cancelled.", "error");
  }
}

// ==========================================
// CALL TIMER
// ==========================================
function startCallTimer() {
  callSeconds = 0;
  clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callSeconds++;
    const m = String(Math.floor(callSeconds / 60)).padStart(2, "0");
    const s = String(callSeconds % 60).padStart(2, "0");
    document.getElementById("call-timer").textContent = `${m}:${s}`;
  }, 1000);
}
function stopCallTimer() {
  clearInterval(callTimerInterval);
  document.getElementById("call-timer").textContent = "00:00";
}

// ==========================================
// MODALS & UI HELPERS
// ==========================================
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
  el.style.display = "flex";
  el.style.visibility = "visible";
  el.style.opacity = "1";
  el.style.pointerEvents = "all";
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("hidden");
  el.style.display = "none";
  el.style.visibility = "hidden";
  el.style.pointerEvents = "none";
}

function setModalLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  const text = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".btn-spinner");
  if (text) text.style.display = loading ? "none" : "inline";
  if (spinner) spinner.style.display = loading ? "block" : "none";
}

function setNavActive(tab) {
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  const el = document.getElementById(`nav-${tab}`);
  if (el) el.classList.add("active");
  if (tab === "notifications") {
    openNotificationsModal();
  }
}

// ==========================================
// TOAST
// ==========================================
function showToast(title, body, type = "info") {
  const container = document.getElementById("toast-container");
  const icons = {
    success: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    error: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    info: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-text">
      <div class="toast-title">${escapeHtml(title)}</div>
      ${body ? `<div class="toast-body">${escapeHtml(body)}</div>` : ""}
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 220);
  }, 4000);
}

// ==========================================
// PROFILE MANAGEMENT
// ==========================================
async function openProfileModal() {
  try {
    const res = await apiFetch("/user/me");
    const u = res?.data || res;
    if (u) {
      Auth.setSession(Auth.getToken(), { ...user, ...u });
    }
  } catch (e) {
    // fallback to stored session
  }

  const currentUser = Auth.getUser() || user;
  document.getElementById("profile-name-input").value = currentUser.name || "";
  document.getElementById("profile-email-input").value = currentUser.email || "";

  const avatarDisplay = document.getElementById("profile-avatar-display");
  const imgDisplay = document.getElementById("profile-pic-img");

  if (currentUser.profilePic) {
    const src = currentUser.profilePic.startsWith('http')
      ? currentUser.profilePic
      : `${SOCKET_URL}${currentUser.profilePic.startsWith('/') ? '' : '/'}${currentUser.profilePic}`;
    imgDisplay.src = src;
    imgDisplay.style.display = "block";
    avatarDisplay.style.display = "none";
  } else {
    imgDisplay.style.display = "none";
    avatarDisplay.style.display = "flex";
    avatarDisplay.textContent = (currentUser.name || currentUser.email || "U").charAt(0).toUpperCase();
  }

  document.getElementById("profile-old-pass").value = "";
  document.getElementById("profile-new-pass").value = "";
  openModal("modal-profile");
}

async function saveProfile() {
  const name = document.getElementById("profile-name-input").value.trim();
  if (!name) return showToast("Error", "Name cannot be empty.", "error");

  setModalLoading("btn-save-profile", true);
  try {
    const res = await apiFetch("/user/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    const updated = res?.data || res;
    const current = Auth.getUser() || {};
    Auth.setSession(Auth.getToken(), { ...current, name: updated.name || name });
    initUI();
    showToast("Profile Updated", "Your name has been updated!", "success");
    closeModal("modal-profile");

    if (currentTeam) {
      await loadChatHistory(currentTeam.id);
    }
  } catch (err) {
    showToast("Error", err.message || "Could not update profile.", "error");
  } finally {
    setModalLoading("btn-save-profile", false);
  }
}

async function handleProfilePicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("profilePic", file);

  showToast("Uploading", "Updating profile picture...", "info");
  try {
    const res = await fetch(`${API}/user/profile-pic`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Auth.getToken()}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    const updated = json?.data || json;
    const pic = updated.profilePic || updated.path;

    const current = Auth.getUser() || {};
    Auth.setSession(Auth.getToken(), { ...current, profilePic: pic });
    initUI();

    const imgDisplay = document.getElementById("profile-pic-img");
    const avatarDisplay = document.getElementById("profile-avatar-display");
    const src = pic.startsWith('http') ? pic : `${SOCKET_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
    imgDisplay.src = src;
    imgDisplay.style.display = "block";
    avatarDisplay.style.display = "none";

    showToast("Success", "Profile picture updated!", "success");
    if (currentTeam) {
      await loadChatHistory(currentTeam.id);
    }
  } catch (err) {
    showToast("Error", "Could not upload profile picture.", "error");
  }
}

async function changePassword() {
  const oldPassword = document.getElementById("profile-old-pass").value;
  const newPassword = document.getElementById("profile-new-pass").value;

  if (!oldPassword || !newPassword) {
    return showToast("Error", "Please fill in both current and new password.", "error");
  }
  if (newPassword.length < 6) {
    return showToast("Error", "New password must be at least 6 characters.", "error");
  }

  try {
    const res = await apiFetch("/user/change-password", {
      method: "PATCH",
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    document.getElementById("profile-old-pass").value = "";
    document.getElementById("profile-new-pass").value = "";
    showToast("Success", res.message || "Password changed successfully!", "success");
  } catch (err) {
    showToast("Error", err.message || "Could not change password.", "error");
  }
}

// ==========================================
// AUTH
// ==========================================
function logout() {
  Auth.clear();
  window.location.href = "../auth/auth.html";
}

// ==========================================
// UTILITIES
// ==========================================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================
// NOTIFICATIONS MANAGEMENT
// ==========================================
let currentNotifFilter = "all";
let globalNotificationsList = [];

async function openNotificationsModal(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  const navItem = document.getElementById("nav-notifications");
  if (navItem) navItem.classList.add("active");

  openModal("modal-notifications");
  await fetchAndRenderNotifications();
}

function filterNotifs(filter, btn) {
  currentNotifFilter = filter;
  document.querySelectorAll("#notif-filter-buttons .notif-filter-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderNotificationsList(globalNotificationsList);
}

async function fetchAndRenderNotifications() {
  let dbNotifications = [];
  try {
    const res = await apiFetch("/notification");
    dbNotifications = res?.data || res?.notifications || (Array.isArray(res) ? res : []);
  } catch (err) {
    console.warn("Could not fetch notifications from backend:", err);
  }

  // Combine live team updates + DB notifications
  const fallbackList = generateFallbackGroupNotifications();
  const combinedMap = new Map();
  dbNotifications.forEach(n => combinedMap.set(n.id, n));
  fallbackList.forEach(n => {
    if (!combinedMap.has(n.id)) {
      combinedMap.set(n.id, n);
    }
  });

  const notifications = Array.from(combinedMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  globalNotificationsList = notifications;
  renderNotificationsList(notifications);
}

function renderNotificationsList(notifications) {
  const container = document.getElementById("notifications-list");
  const countLabel = document.getElementById("notif-count-label");
  const badge = document.getElementById("notif-badge");
  if (!container) return;

  const totalUnread = notifications.filter(n => !n.isRead).length;
  if (badge) {
    if (totalUnread > 0) {
      badge.style.display = "flex";
      badge.textContent = totalUnread > 9 ? "9+" : totalUnread;
    } else {
      badge.style.display = "none";
    }
  }

  // Filter list
  let filtered = notifications;
  if (currentNotifFilter === "message") {
    filtered = notifications.filter(n => n.type === "message" || n.type === "chat");
  } else if (currentNotifFilter === "mention") {
    filtered = notifications.filter(n => n.type === "mention");
  } else if (currentNotifFilter === "call") {
    filtered = notifications.filter(n => n.type === "call" || n.type === "video_call");
  }

  if (countLabel) {
    countLabel.textContent = `${totalUnread} Unread • Showing ${filtered.length} of ${notifications.length} notifications`;
  }

  container.innerHTML = "";
  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 0;color:var(--clr-text-dim);">
        <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="opacity:0.4;margin-bottom:8px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        <p style="font-size:0.85rem;">No notifications in this category.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(n => {
    const item = document.createElement("div");
    const isRead = n.isRead;
    
    let typeIcon = "💬";
    let typeBadge = "Message";
    let bgStyle = isRead ? 'rgba(255,255,255,0.03)' : 'rgba(26,115,232,0.12)';
    let borderStyle = isRead ? 'rgba(255,255,255,0.06)' : 'rgba(26,115,232,0.3)';
    let actionBtn = "";

    if (n.type === "call" || n.type === "video_call") {
      typeIcon = "📹";
      typeBadge = "Live Call";
      bgStyle = isRead ? 'rgba(255,255,255,0.03)' : 'rgba(234,67,53,0.12)';
      borderStyle = isRead ? 'rgba(255,255,255,0.06)' : 'rgba(234,67,53,0.35)';
      actionBtn = `<button onclick="openNotificationAction('${n.id}', '${n.relatedId || ''}', 'call')" style="padding:5px 12px;font-size:0.75rem;background:#ea4335;color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">📹 Join Call</button>`;
    } else if (n.type === "mention") {
      typeIcon = "🏷️";
      typeBadge = "Mention";
      bgStyle = isRead ? 'rgba(255,255,255,0.03)' : 'rgba(251,191,36,0.12)';
      borderStyle = isRead ? 'rgba(255,255,255,0.06)' : 'rgba(251,191,36,0.35)';
      actionBtn = `<button onclick="openNotificationAction('${n.id}', '${n.relatedId || ''}', 'chat')" style="padding:5px 12px;font-size:0.75rem;background:var(--clr-primary);color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">💬 Open Chat</button>`;
    } else if (n.type === "message" || n.type === "chat") {
      typeIcon = "💬";
      typeBadge = "Message";
      actionBtn = `<button onclick="openNotificationAction('${n.id}', '${n.relatedId || ''}', 'chat')" style="padding:5px 12px;font-size:0.75rem;background:rgba(255,255,255,0.08);color:white;border:1px solid var(--clr-border);border-radius:6px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">💬 View</button>`;
    } else {
      typeIcon = "👥";
      typeBadge = "Team Update";
      actionBtn = `<button onclick="openNotificationAction('${n.id}', '${n.relatedId || ''}', 'team')" style="padding:5px 12px;font-size:0.75rem;background:rgba(255,255,255,0.08);color:white;border:1px solid var(--clr-border);border-radius:6px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">👥 Open Team</button>`;
    }

    item.style.cssText = `
      padding: 12px 14px;
      border-radius: 12px;
      background: ${bgStyle};
      border: 1px solid ${borderStyle};
      display: flex;
      gap: 12px;
      align-items: flex-start;
      transition: all 0.2s ease;
    `;

    const timeStr = n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";

    item.innerHTML = `
      <div style="font-size:1.15rem;padding:6px;background:rgba(255,255,255,0.06);border-radius:8px;flex-shrink:0;">${typeIcon}</div>
      <div style="flex:1;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:0.84rem;font-weight:700;color:var(--clr-text);">${escapeHtml(n.title || "Notification")}</span>
            <span style="font-size:0.65rem;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,0.08);color:var(--clr-text-muted);font-weight:700;">${typeBadge}</span>
          </div>
          <span style="font-size:0.7rem;color:var(--clr-text-dim);white-space:nowrap;">${timeStr}</span>
        </div>
        <div style="font-size:0.8rem;color:var(--clr-text-muted);margin-top:3px;line-height:1.35;">${escapeHtml(n.content || n.message || "Activity update")}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          ${actionBtn}
          ${!isRead ? `<button onclick="markNotificationRead('${n.id}')" title="Mark as read" style="background:none;border:none;color:var(--clr-text-muted);font-weight:600;font-size:0.72rem;cursor:pointer;padding:2px 6px;">Mark Read</button>` : ''}
        </div>
      </div>
    `;

    container.appendChild(item);
  });
}

async function openNotificationAction(notifId, teamId, actionType) {
  closeModal("modal-notifications");
  if (teamId) {
    const team = allTeams.find(t => String(t.id) === String(teamId));
    if (team) {
      await selectTeam(team);
      if (actionType === "call") {
        showLobby();
      }
    }
  }
  markNotificationRead(notifId);
}

function generateFallbackGroupNotifications() {
  const list = [];
  if (allTeams && allTeams.length > 0) {
    allTeams.forEach(t => {
      list.push({
        id: "team-" + t.id,
        type: "team_update",
        title: `Team: ${t.name}`,
        content: `You are a member of "${t.name}". Invite code: ${t.inviteCode || t.code || 'N/A'}`,
        relatedId: t.id,
        isRead: false,
        createdAt: t.createdAt || new Date().toISOString()
      });
    });
  } else {
    list.push({
      id: "welcome-notif",
      type: "message",
      title: "Welcome to CollabHub",
      content: "Join or create a team to receive live message alerts, calls, mentions, and notifications.",
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }
  return list;
}

async function markNotificationRead(id) {
  try {
    await apiFetch(`/notification/${id}/read`, { method: "PATCH" });
  } catch (e) {
    console.warn("Mark read failed:", e);
  }
  fetchAndRenderNotifications();
}

async function markAllNotificationsRead() {
  try {
    await apiFetch("/notification/read-all", { method: "PATCH" });
    showToast("Notifications", "All notifications marked as read", "success");
  } catch (e) {
    showToast("Notifications", "All notifications marked as read", "info");
  }
  fetchAndRenderNotifications();
}

// Close modals on overlay click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.add("hidden");
  }
});

// ==========================================
// START
// ==========================================
init();
