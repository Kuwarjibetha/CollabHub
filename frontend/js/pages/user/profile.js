if (!Auth.isLoggedIn()) {
  window.location.href = "../auth/auth.html";
}

let currentUser = Auth.getUser();

async function loadUserProfile() {
  try {
    const res = await apiFetch("/user/me");
    const u = res?.data || res;
    if (u) {
      currentUser = { ...currentUser, ...u };
      Auth.setSession(Auth.getToken(), currentUser);
    }
  } catch (e) {
    console.warn("Could not fetch fresh user profile:", e);
  }

  renderUserData();
}

function renderUserData() {
  const name = currentUser?.name || currentUser?.email || "User";
  const email = currentUser?.email || "";
  const initials = name.charAt(0).toUpperCase();

  document.getElementById("display-user-name").textContent = name;
  document.getElementById("display-user-email").textContent = email;
  document.getElementById("input-name").value = currentUser?.name || "";
  document.getElementById("input-email").value = email;

  const avatarBox = document.getElementById("avatar-display-box");
  const avatarImg = document.getElementById("avatar-img-box");

  if (currentUser?.profilePic) {
    const pic = currentUser.profilePic;
    const src = pic.startsWith('http') ? pic : `${CONFIG.SOCKET_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
    avatarImg.src = src;
    avatarImg.style.display = "block";
    avatarBox.style.display = "none";
  } else {
    avatarImg.style.display = "none";
    avatarBox.style.display = "flex";
    avatarBox.textContent = initials;
  }
}

async function savePersonalDetails(e) {
  e.preventDefault();
  const name = document.getElementById("input-name").value.trim();
  if (!name) return showToast("Name cannot be empty.", "error");

  try {
    const res = await apiFetch("/user/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    const updated = res?.data || res;
    currentUser = { ...currentUser, name: updated.name || name };
    Auth.setSession(Auth.getToken(), currentUser);
    renderUserData();
    showToast("Profile details updated successfully!", "success");
  } catch (err) {
    showToast(err.message || "Failed to update profile.", "error");
  }
}

async function uploadPicture(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("profilePic", file);

  showToast("Uploading new picture...", "success");
  try {
    const res = await fetch(`${CONFIG.API_BASE}/user/profile-pic`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Auth.getToken()}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    const updated = json?.data || json;
    const pic = updated.profilePic || updated.path;

    currentUser = { ...currentUser, profilePic: pic };
    Auth.setSession(Auth.getToken(), currentUser);
    renderUserData();
    showToast("Profile picture uploaded successfully!", "success");
  } catch (err) {
    showToast(err.message || "Failed to upload picture.", "error");
  }
}

async function updatePassword(e) {
  e.preventDefault();
  const oldPassword = document.getElementById("input-old-pass").value;
  const newPassword = document.getElementById("input-new-pass").value;

  if (!oldPassword || !newPassword) return showToast("Fill all password fields.", "error");
  if (newPassword.length < 6) return showToast("New password must be at least 6 chars.", "error");

  try {
    const res = await apiFetch("/user/change-password", {
      method: "PATCH",
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    document.getElementById("input-old-pass").value = "";
    document.getElementById("input-new-pass").value = "";
    showToast(res.message || "Password updated successfully!", "success");
  } catch (err) {
    showToast(err.message || "Failed to change password.", "error");
  }
}

function handleLogout() {
  Auth.clear();
  window.location.href = "../auth/auth.html";
}

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast-box ${type}`;
  t.style.display = "block";
  setTimeout(() => { t.style.display = "none"; }, 3500);
}

// Window bindings
window.uploadPicture = uploadPicture;
window.savePersonalDetails = savePersonalDetails;
window.updatePassword = updatePassword;
window.handleLogout = handleLogout;
window.showToast = showToast;

loadUserProfile();
