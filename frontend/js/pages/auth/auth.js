// ==========================================
// Auth Page Logic — auth.js
// ==========================================

// Redirect if already logged in
if (Auth.isLoggedIn()) {
  window.location.href = "pages/dashboard.html";
}

// Tab switching
function switchTab(tab) {
  const loginForm = document.getElementById("form-login");
  const signupForm = document.getElementById("form-signup");
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  const indicator = document.getElementById("tab-indicator");

  loginForm.style.display = tab === "login" ? "flex" : "none";
  signupForm.style.display = tab === "signup" ? "flex" : "none";

  tabLogin.classList.toggle("active", tab === "login");
  tabSignup.classList.toggle("active", tab === "signup");
  indicator.classList.toggle("right", tab === "signup");

  clearAlert();
}

// Show alert
function showAlert(msg, type = "error") {
  const banner = document.getElementById("alert-banner");
  banner.textContent = msg;
  banner.className = `alert-banner ${type}`;
  banner.style.display = "block";
}
function clearAlert() {
  const banner = document.getElementById("alert-banner");
  banner.style.display = "none";
}

// Button loading state
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  const text = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".btn-spinner");
  btn.disabled = loading;
  text.style.display = loading ? "none" : "inline";
  spinner.style.display = loading ? "block" : "none";
}

// Login
async function handleLogin(e) {
  e.preventDefault();
  clearAlert();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) return showAlert("Please fill in all fields.");

  setLoading("btn-login", true);
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Backend may return token + user or just token
    const token = data.token || data.accessToken;
    const user = data.user || { email };
    Auth.setSession(token, user);
    showAlert("Login successful! Redirecting...", "success");
    setTimeout(() => window.location.href = "pages/dashboard.html", 800);
  } catch (err) {
    showAlert(err.message || "Login failed. Please check your credentials.");
  } finally {
    setLoading("btn-login", false);
  }
}

// Signup
async function handleSignup(e) {
  e.preventDefault();
  clearAlert();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  if (!name || !email || !password) return showAlert("Please fill in all fields.");
  if (password.length < 6) return showAlert("Password must be at least 6 characters.");

  setLoading("btn-signup", true);
  try {
    await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    showAlert("Account created! Please login.", "success");
    setTimeout(() => switchTab("login"), 1200);
  } catch (err) {
    showAlert(err.message || "Signup failed. Please try again.");
  } finally {
    setLoading("btn-signup", false);
  }
}
