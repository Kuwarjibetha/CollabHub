const BACKEND_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:5000"
  : "https://collabhub-qvx3.onrender.com";

const CONFIG = {
  API_BASE: `${BACKEND_URL}/api/v1`,
  SOCKET_URL: BACKEND_URL,
};

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

async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let res, data;
  try {
    res = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    data = await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Backend may be starting up. Please wait and try again.");
    }
    throw new Error("Backend server is starting up. Please wait 15-30 seconds and try again.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}
