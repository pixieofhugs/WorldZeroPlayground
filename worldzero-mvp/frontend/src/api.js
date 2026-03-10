const API = "http://localhost:8000";

const opts = (method, body) => ({
  method,
  credentials: "include",
  headers: body !== undefined ? { "Content-Type": "application/json" } : {},
  ...(body !== undefined && { body: JSON.stringify(body) }),
});

async function request(method, path, body) {
  const res = await fetch(`${API}${path}`, opts(method, body));
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      detail = json.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const get = (path) => request("GET", path);
export const post = (path, body) => request("POST", path, body);
export const put = (path, body) => request("PUT", path, body);
export const del = (path) => request("DELETE", path);

// Auth
export const fetchMe = () => get("/auth/me");
export const logout = () => post("/auth/logout");
export const loginUrl = () => `${API}/auth/google`;

// Characters
export const createCharacter = (data) => post("/characters", data);
export const getCharacter = (id) => get(`/characters/${id}`);
export const updateCharacter = (id, data) => put(`/characters/${id}`, data);
export const getCharacterSubmissions = (id) => get(`/characters/${id}/submissions`);

// Tasks
export const getTasks = (status = "active") => get(`/tasks?status=${status}`);
export const getTask = (id) => get(`/tasks/${id}`);
export const signupTask = (id) => post(`/tasks/${id}/signup`);
export const dropTask = (id) => del(`/tasks/${id}/signup`);

// Submissions
export const getSubmissions = (page = 1) => get(`/submissions?page=${page}`);
export const getSubmission = (id) => get(`/submissions/${id}`);
export const createSubmission = (data) => post("/submissions", data);
export const updateSubmission = (id, data) => put(`/submissions/${id}`, data);

// Votes
export const castVote = (submissionId, stars) =>
  post(`/submissions/${submissionId}/vote`, { stars });

// Leaderboard
export const getLeaderboard = () => get("/leaderboard");

// My data
export const getMySignups = () => get("/me/signups");
export const getMyVotes = () => get("/me/votes");
