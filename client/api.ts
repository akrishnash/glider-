const API = "/api";

export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Login failed");
  return data;
}

export async function register(email: string, password: string) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Register failed");
  return data;
}

export async function me(token: string) {
  const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Not authenticated");
  return data;
}

export async function demoLogin() {
  const res = await fetch(`${API}/auth/demo`, { method: "POST", headers: { "Content-Type": "application/json" } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Demo login failed");
  return data;
}

export async function getProfile(token: string) {
  const res = await fetch(`${API}/profile`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to load profile");
  return data;
}

export async function updateProfile(token: string, profile: Record<string, string>) {
  const res = await fetch(`${API}/profile`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Update failed");
  return data;
}

export async function getPreferences(token: string) {
  const res = await fetch(`${API}/preferences`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to load preferences");
  return data;
}

export async function updatePreferences(token: string, preferences: Record<string, unknown>) {
  const res = await fetch(`${API}/preferences`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Update failed");
  return data;
}

export async function uploadResume(token: string, file: File) {
  const form = new FormData();
  form.append("resume", file);
  const res = await fetch(`${API}/resumes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Upload failed");
  return data;
}

export async function getResumes(token: string) {
  const res = await fetch(`${API}/resumes`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to load resumes");
  return data;
}

export async function ingestJobs(token: string, urls: string[]) {
  const res = await fetch(`${API}/jobs/ingest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Ingest failed");
  return data;
}

export async function getJobs(token: string, params?: { platform?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.platform) q.set("platform", params.platform);
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await fetch(`${API}/jobs?${q}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to load jobs");
  return data;
}

export async function getJob(token: string, id: string) {
  const res = await fetch(`${API}/jobs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to load job");
  return data;
}

export async function getApplicationPlan(token: string, jobId: string) {
  const res = await fetch(`${API}/applications/plan`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to build plan");
  return data;
}

export async function runApplications(token: string, jobIds: string[]) {
  const res = await fetch(`${API}/applications/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(jobIds.length === 1 ? { job_id: jobIds[0] } : { job_ids: jobIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Run failed");
  return data;
}

export async function getApplications(token: string, params?: { status?: string; job_id?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.job_id) q.set("job_id", params.job_id);
  const res = await fetch(`${API}/applications?${q}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to load applications");
  return data;
}

export async function getApplication(token: string, id: string) {
  const res = await fetch(`${API}/applications/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to load application");
  return data;
}

export async function getApplicationStats(token: string) {
  const res = await fetch(`${API}/applications/stats`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to load stats");
  return data;
}
