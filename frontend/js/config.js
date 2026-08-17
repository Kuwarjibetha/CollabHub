const BACKEND_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:5000"
  : "https://collabhub-qvx3.onrender.com";

const CONFIG = {
  API_BASE: `${BACKEND_URL}/api/v1`,
  SOCKET_URL: BACKEND_URL,
};

// Token helpers
const Auth = {
  getToken: () => localStorage.getItem("token"),
  getUser: () => JSON.parse(localStorage.getItem("user") || "null"),
  setSession: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
  isLoggedIn: () => !!localStorage.getItem("token"),
};

// Generic fetch wrapper
async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}
