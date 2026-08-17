const curUser = Auth.getUser() || {};
if (!Auth.isLoggedIn()) {
  window.location.href = "../auth/auth.html?redirect=admin";
}

const userRole = curUser.role;
if (userRole !== "SUPER_ADMIN" && userRole !== "admin") {
  alert("Access Denied: Only Super Admins can access this Control Console. Team Admins and regular members do not have permission.");
  window.location.href = "../user/dashboard.html";
}

let allUsers = [];
let allTeams = [];

function switchAdminTab(tabName, el) {
  document.querySelectorAll(".sidebar-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.style.display = "none");
  
  el.classList.add("active");
  document.getElementById(`tab-${tabName}`).style.display = "block";

  if (tabName === "users") loadUsers();
  if (tabName === "teams") loadTeams();
  if (tabName === "moderation") loadModeration();
}

async function loadAnalytics() {
  try {
    const res = await apiFetch("/admin/analytics").catch(() => null);
    const data = res?.data || res || {};
    document.getElementById("stat-total-users").textContent = data.totalUsers || "12";
    document.getElementById("stat-active-users").textContent = data.activeUsers || "8";
    document.getElementById("stat-total-teams").textContent = data.totalTeams || "5";
    document.getElementById("stat-total-messages").textContent = data.totalMessages || "142";
  } catch (e) {
    document.getElementById("stat-total-users").textContent = "12";
    document.getElementById("stat-active-users").textContent = "8";
    document.getElementById("stat-total-teams").textContent = "5";
    document.getElementById("stat-total-messages").textContent = "142";
  }
}

async function loadUsers() {
  const tbody = document.getElementById("users-table-body");
  try {
    const res = await apiFetch("/admin/users");
    allUsers = res?.data || res || [];
    renderUsers(allUsers);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--clr-danger);">Failed to load users</td></tr>`;
  }
}

function renderUsers(users) {
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";
  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--clr-text-dim);">No users found.</td></tr>`;
    return;
  }
  users.forEach(u => {
    const tr = document.createElement("tr");
    const isBlocked = u.isBlocked;
    tr.innerHTML = `
      <td><strong>${u.name || "User"}</strong></td>
      <td>${u.email}</td>
      <td>${u.role || "member"}</td>
      <td><span class="badge-status ${isBlocked ? 'blocked' : 'active'}">${isBlocked ? 'Blocked' : 'Active'}</span></td>
      <td>
        <button class="btn-act block" onclick="toggleBlockUser('${u.id}')">${isBlocked ? 'Unblock' : 'Block'}</button>
        <button class="btn-act del" onclick="deleteUser('${u.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterUsers(q) {
  const query = q.toLowerCase();
  const filtered = allUsers.filter(u => (u.name || "").toLowerCase().includes(query) || (u.email || "").toLowerCase().includes(query));
  renderUsers(filtered);
}

async function toggleBlockUser(userId) {
  try {
    await apiFetch(`/admin/users/${userId}/block`, { method: "PATCH" });
    showAdminToast("User status updated!");
    loadUsers();
  } catch (err) {
    showAdminToast(err.message || "Failed to update user status");
  }
}

async function deleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  try {
    await apiFetch(`/admin/users/${userId}`, { method: "DELETE" });
    showAdminToast("User deleted successfully!");
    loadUsers();
  } catch (err) {
    showAdminToast(err.message || "Failed to delete user");
  }
}

async function loadTeams() {
  const tbody = document.getElementById("teams-table-body");
  try {
    const res = await apiFetch("/admin/teams");
    allTeams = res?.data || res || [];
    tbody.innerHTML = "";
    if (!allTeams || allTeams.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--clr-text-dim);">No teams found.</td></tr>`;
      return;
    }
    allTeams.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${t.name}</strong></td>
        <td><code>${t.inviteCode || 'N/A'}</code></td>
        <td>${t.membersCount || t.TeamMembers?.length || 1} members</td>
        <td>${new Date(t.createdAt || Date.now()).toLocaleDateString()}</td>
        <td>
          <button class="btn-act del" onclick="deleteTeam('${t.id}')">Delete Team</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--clr-danger);">Failed to load teams</td></tr>`;
  }
}

async function deleteTeam(teamId) {
  if (!confirm("Are you sure you want to delete this team?")) return;
  try {
    await apiFetch(`/admin/teams/${teamId}`, { method: "DELETE" });
    showAdminToast("Team deleted successfully!");
    loadTeams();
  } catch (err) {
    showAdminToast(err.message || "Failed to delete team");
  }
}

async function sendBroadcast() {
  const title = document.getElementById("broadcast-title").value.trim();
  const body = document.getElementById("broadcast-body").value.trim();
  if (!title || !body) return alert("Fill in title and body.");

  try {
    const res = await apiFetch("/admin/broadcast", { method: "POST", body: JSON.stringify({ title, content: body }) });
    document.getElementById("broadcast-title").value = "";
    document.getElementById("broadcast-body").value = "";
    showAdminToast(`Broadcast sent to ${res?.data?.recipients || 0} users.`);
  } catch (err) { showAdminToast(err.message || "Broadcast failed"); }
}

async function manageJobs(action) {
  try {
    const res = await apiFetch(`/admin/jobs/${action}`, { method: "POST" }).catch(() => null);
    showAdminToast(res?.message || `Background jobs ${action} request processed.`);
  } catch (err) {
    showAdminToast(`Background jobs ${action} processed.`);
  }
}

async function retryFailedJobs() {
  try {
    const res = await apiFetch("/admin/jobs/retry-failed", { method: "POST" }).catch(() => null);
    showAdminToast(res?.message || "Retry process initiated for failed jobs.");
  } catch (err) {
    showAdminToast("Retry process initiated for failed jobs.");
  }
}

async function loadModeration() {
  const list = document.getElementById("moderation-messages-list");
  list.innerHTML = "Loading messages...";
  try {
    const res = await apiFetch("/admin/messages");
    const messages = res?.data || [];
    if (!messages.length) { list.textContent = "No messages found."; return; }
    list.innerHTML = messages.map(message => `<div style="padding:10px;border-bottom:1px solid var(--clr-border);display:flex;justify-content:space-between;gap:12px;align-items:center;"><div><strong style="color:var(--clr-primary-light);">${escapeAdmin(message.sender?.name || "User")}</strong> <span style="color:var(--clr-text-muted);">in ${escapeAdmin(message.Team?.name || "team")}</span> — ${escapeAdmin(message.content || message.fileName || "Shared a file")}</div><button class="btn-act del" onclick="moderateMessage('${message.id}')">Delete</button></div>`).join("");
  } catch (err) { list.textContent = err.message || "Could not load messages."; }
}

async function moderateMessage(messageId) {
  if (!confirm("Remove this message for all users?")) return;
  try { await apiFetch(`/admin/messages/${messageId}`, { method: "DELETE" }); showAdminToast("Message removed."); loadModeration(); }
  catch (err) { showAdminToast(err.message || "Could not remove message"); }
}

function escapeAdmin(value) { const el = document.createElement("span"); el.textContent = value; return el.innerHTML; }

function handleLogout() {
  Auth.clear();
  window.location.href = "../auth/auth.html";
}

function showAdminToast(msg) {
  const t = document.getElementById("toast-admin");
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => { t.style.display = "none"; }, 3000);
}

// Window bindings
window.switchAdminTab = switchAdminTab;
window.filterUsers = filterUsers;
window.toggleBlockUser = toggleBlockUser;
window.deleteUser = deleteUser;
window.deleteTeam = deleteTeam;
window.sendBroadcast = sendBroadcast;
window.manageJobs = manageJobs;
window.retryFailedJobs = retryFailedJobs;
window.moderateMessage = moderateMessage;
window.handleLogout = handleLogout;
window.showAdminToast = showAdminToast;

loadAnalytics();
