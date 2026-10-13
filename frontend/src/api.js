// frontend/src/api.js
// One place for every call to the FastAPI backend.
// - Adds the JWT as "Authorization: Bearer <token>" automatically
// - Turns FastAPI error bodies into readable messages
// - On an expired session (401) it clears the token and fires "auth:logout"

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "cs_token";

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: user will have to log in again after reload */
  }
};

// Image URLs from the backend look like "/uploads/abc.jpg"; make them absolute.
export const assetUrl = (path) =>
  !path ? "" : /^https?:\/\//.test(path) ? path : BASE + path;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// FastAPI sends {"detail": "text"} for HTTPException and
// {"detail": [{"loc": [...], "msg": "..."}]} for validation errors (422).
function messageFrom(data, status) {
  const detail = data && data.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : null;
    return field && field !== "body" ? `${field}: ${first.msg}` : first.msg;
  }
  return `Request failed (${status})`;
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, v)); // ?tools=Runway&tools=Sora
    } else if (value !== undefined && value !== null && value !== "" && value !== false) {
      qs.append(key, value);
    }
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function request(path, { method = "GET", body, params, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = { method, headers };
  if (form) {
    options.body = form; // FormData: the browser sets the multipart header itself
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(BASE + path + buildQuery(params), options);
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      /* empty or non-JSON body */
    }
  }

  if (!res.ok) {
    const isAuthForm = path.startsWith("/auth/login") || path.startsWith("/auth/signup");
    if (res.status === 401 && token && !isAuthForm) {
      setToken(null);
      window.dispatchEvent(new Event("auth:logout"));
    }
    throw new ApiError(messageFrom(data, res.status), res.status);
  }
  return data;
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
  upload: (path, formData) => request(path, { method: "POST", form: formData }),

  // ---- auth (matches routers/auth.py) ----
  signup: (data) => request("/auth/signup", { method: "POST", body: data }),
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  me: () => request("/auth/me"),

  // ---- feed (matches routers/feed.py) ----
  creators: (filters) => request("/creators", { params: filters }),
  briefs: (filters) => request("/briefs", { params: filters }),
};