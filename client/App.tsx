import React, { useState, useEffect, useCallback } from "react";
import * as api from "./api";

type User = { id: string; email: string } | null;

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("glider_token"));
  const [user, setUser] = useState<User>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let t = token;
      if (!t) {
        try {
          const data = await api.demoLogin();
          t = data.token;
          if (t && !cancelled) {
            localStorage.setItem("glider_token", t);
            setToken(t);
            setUser(data.user);
          }
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : "Failed to start");
        }
      } else {
        try {
          const { user } = await api.me(t);
          if (!cancelled) setUser(user);
        } catch {
          if (!cancelled) {
            setToken(null);
            localStorage.removeItem("glider_token");
            const data = await api.demoLogin();
            if (data.token) {
              localStorage.setItem("glider_token", data.token);
              setToken(data.token);
              setUser(data.user);
            }
          }
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#a1a1aa" }}>
        Loading…
      </div>
    );
  }

  if (error && !token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#a1a1aa" }}>
        Loading…
      </div>
    );
  }

  return (
    <Dashboard
      token={token!}
      user={user}
      onLogout={() => { setToken(null); localStorage.removeItem("glider_token"); window.location.reload(); }}
    />
  );
}

function Dashboard({ token, user, onLogout }: { token: string; user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<"profile" | "jobs" | "applications">("jobs");
  const [stats, setStats] = useState<{ total_runs: number; submitted: number; failed: number; running: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getApplicationStats(token).then((s) => setStats(s)).catch(() => setStats(null));
    const t = setInterval(() => api.getApplicationStats(token).then((s) => setStats(s)).catch(() => {}), 20000);
    return () => clearInterval(t);
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "16px 24px", borderBottom: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: "1.25rem", margin: 0 }}>Glider</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {stats != null && (
            <span style={{ fontSize: 13, color: "#a1a1aa" }} title="TinyFish runs started (≈ credits used)">
              {stats.total_runs} run{stats.total_runs !== 1 ? "s" : ""}
              {stats.submitted > 0 && <span style={{ color: "#22c55e", marginLeft: 6 }}>✓ {stats.submitted}</span>}
              {stats.running > 0 && <span style={{ color: "#eab308", marginLeft: 4 }}>⋯ {stats.running}</span>}
            </span>
          )}
          <span style={{ color: "#a1a1aa" }}>{user?.email}</span>
          <button onClick={onLogout} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#e4e4e7" }}>
            Log out
          </button>
        </div>
      </header>
      <nav style={{ display: "flex", gap: 8, padding: "12px 24px", borderBottom: "1px solid #27272a" }}>
        {(["profile", "jobs", "applications"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: tab === t ? "#27272a" : "transparent",
              color: "#e4e4e7",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      <main style={{ flex: 1, padding: 24 }}>
        {tab === "profile" && <ProfileTab token={token} />}
        {tab === "jobs" && <JobsTab token={token} onGoApplications={() => setTab("applications")} />}
        {tab === "applications" && <ApplicationsTab token={token} />}
      </main>
    </div>
  );
}

function ProfileTab({ token }: { token: string }) {
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const [prefs, setPrefs] = useState<Record<string, unknown> | null>(null);
  const [resumes, setResumes] = useState<{ id: string; file_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, pr, r] = await Promise.all([api.getProfile(token), api.getPreferences(token), api.getResumes(token)]);
        setProfile(p.profile ? { full_name: p.profile.full_name ?? "", phone: p.profile.phone ?? "", location: p.profile.location ?? "", linkedin_url: p.profile.linkedin_url ?? "", portfolio_url: p.profile.portfolio_url ?? "", summary: p.profile.summary ?? "" } : {});
        setPrefs(pr.preferences ?? {});
        setResumes(r.resumes ?? []);
      } catch {
        setProfile({});
        setPrefs({});
      }
    })();
  }, [token]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await api.updateProfile(token, profile);
    } finally {
      setSaving(false);
    }
  };

  const savePrefs = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      await api.updatePreferences(token, prefs);
    } finally {
      setSaving(false);
    }
  };

  if (profile === null) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>Profile</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {(["full_name", "phone", "location", "linkedin_url", "portfolio_url"] as const).map((k) => (
          <label key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: "#a1a1aa", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
            <input
              value={profile[k] ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p!, [k]: e.target.value }))}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #27272a", background: "#18181b", color: "#fff" }}
            />
          </label>
        ))}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: "#a1a1aa" }}>Summary</span>
          <textarea
            value={profile.summary ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p!, summary: e.target.value }))}
            rows={3}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #27272a", background: "#18181b", color: "#fff", resize: "vertical" }}
          />
        </label>
        <button onClick={saveProfile} disabled={saving} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", alignSelf: "flex-start" }}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>

      <h3>Resume</h3>
      <div style={{ marginBottom: 24 }}>
        {resumes.length > 0 && <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>{resumes.map((r) => <li key={r.id}>{r.file_name}</li>)}</ul>}
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              await api.uploadResume(token, file);
              const r = await api.getResumes(token);
              setResumes(r.resumes ?? []);
            } finally {
              setUploading(false);
              e.target.value = "";
            }
          }}
        />
        {uploading && <span style={{ marginLeft: 8 }}>Uploading…</span>}
      </div>

      <h3>Preferences (roles, locations)</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: "#a1a1aa" }}>Roles (comma-separated)</span>
          <input
            value={Array.isArray(prefs?.roles) ? (prefs.roles as string[]).join(", ") : ""}
            onChange={(e) => setPrefs((p) => ({ ...p!, roles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #27272a", background: "#18181b", color: "#fff" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: "#a1a1aa" }}>Locations (comma-separated)</span>
          <input
            value={Array.isArray(prefs?.locations) ? (prefs.locations as string[]).join(", ") : ""}
            onChange={(e) => setPrefs((p) => ({ ...p!, locations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #27272a", background: "#18181b", color: "#fff" }}
          />
        </label>
        <button onClick={savePrefs} disabled={saving} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", alignSelf: "flex-start" }}>
          Save preferences
        </button>
      </div>
    </div>
  );
}

function JobsTab({ token, onGoApplications }: { token: string; onGoApplications: () => void }) {
  const [jobs, setJobs] = useState<{ id: string; source_url: string; platform: string; company_name?: string; job_title?: string }[]>([]);
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getJobs(token);
      setJobs(data.jobs ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const ingest = async () => {
    const list = urls.split("\n").map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return;
    setIngesting(true);
    setMessage(null);
    try {
      await api.ingestJobs(token, list);
      setUrls("");
      await load();
      setMessage({ type: "ok", text: `Ingested ${list.length} URL${list.length === 1 ? "" : "s"}.` });
    } finally {
      setIngesting(false);
    }
  };

  const [runningFor, setRunningFor] = useState<Set<string>>(new Set());
  const runOne = async (jobId: string) => {
    setRunningFor((s) => new Set(s).add(jobId));
    setMessage(null);
    try {
      const resp = await api.runApplications(token, [jobId]);
      await load();
      const errs = resp?.errors?.length ? resp.errors.map((e: any) => e.message).join(" | ") : null;
      if (errs) {
        setMessage({ type: "err", text: errs });
      } else {
        setMessage({ type: "ok", text: "Glide started. Check Applications for status." });
        onGoApplications();
      }
    } finally {
      setRunningFor((s) => {
        const n = new Set(s);
        n.delete(jobId);
        return n;
      });
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Jobs</h2>
      <p style={{ color: "#a1a1aa", marginBottom: 16 }}>Paste Greenhouse (or other) job URLs, one per line. Then click Ingest. After that, use &quot;Glide&quot; to run the application agent.</p>
      {message && (
        <div
          style={{
            maxWidth: 560,
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid " + (message.type === "ok" ? "#14532d" : "#7f1d1d"),
            background: message.type === "ok" ? "#052e16" : "#450a0a",
            color: message.type === "ok" ? "#bbf7d0" : "#fecaca",
          }}
        >
          {message.text}
        </div>
      )}
      <textarea
        placeholder="https://boards.greenhouse.io/company/jobs/123"
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        rows={4}
        style={{ width: "100%", maxWidth: 560, padding: "8px 12px", marginBottom: 12, borderRadius: 8, border: "1px solid #27272a", background: "#18181b", color: "#fff", resize: "vertical" }}
      />
      <button onClick={ingest} disabled={ingesting} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", marginBottom: 24 }}>
        {ingesting ? "Ingesting…" : "Ingest URLs"}
      </button>

      {loading ? <p>Loading jobs…</p> : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {jobs.map((j) => (
            <li key={j.id} style={{ padding: "12px 0", borderBottom: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <a href={j.source_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 500 }}>{j.job_title || j.source_url}</a>
                {j.company_name && <span style={{ color: "#a1a1aa", marginLeft: 8 }}>{j.company_name}</span>}
                <span style={{ marginLeft: 8, fontSize: 12, color: "#71717a" }}>{j.platform}</span>
              </div>
              <button
                onClick={() => runOne(j.id)}
                disabled={runningFor.has(j.id)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff" }}
              >
                {runningFor.has(j.id) ? "Running…" : "Glide"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && jobs.length === 0 && <p style={{ color: "#71717a" }}>No jobs yet. Ingest some URLs above.</p>}
    </div>
  );
}

function ApplicationsTab({ token }: { token: string }) {
  const [apps, setApps] = useState<{ id: string; job_id: string; status: string; streaming_url?: string | null; submitted_at?: number; created_at: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsMap, setJobsMap] = useState<Record<string, { job_title?: string; company_name?: string; source_url: string }>>({});
  const [watchUrl, setWatchUrl] = useState<string | null>(null);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const [details, setDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [data, jobsData] = await Promise.all([api.getApplications(token), api.getJobs(token)]);
      setApps(data.applications ?? []);
      const map: Record<string, { job_title?: string; company_name?: string; source_url: string }> = {};
      for (const j of jobsData.jobs ?? []) {
        map[j.id] = { job_title: j.job_title, company_name: j.company_name, source_url: j.source_url };
      }
      setJobsMap(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [token]);

  useEffect(() => {
    if (!detailsFor) return;
    setDetailsLoading(true);
    setDetails(null);
    setDetailsError(null);
    api
      .getApplication(token, detailsFor)
      .then((d) => setDetails(d?.application ?? null))
      .catch((e) => setDetailsError(e instanceof Error ? e.message : "Failed to load details"))
      .finally(() => setDetailsLoading(false));
  }, [token, detailsFor]);

  if (loading && apps.length === 0) return <p>Loading applications…</p>;

  const statusColor: Record<string, string> = {
    pending: "#71717a",
    running: "#eab308",
    submitted: "#22c55e",
    failed: "#ef4444",
    manual_review: "#f97316",
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Applications</h2>
      <p style={{ color: "#a1a1aa", marginBottom: 16 }}>Status of your Glider runs. Each run uses TinyFish credits. Polls every 15s.</p>
      {detailsFor && (
        <div style={{ marginBottom: 16, border: "1px solid #27272a", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#18181b", borderBottom: "1px solid #27272a" }}>
            <div style={{ color: "#e4e4e7", fontWeight: 600 }}>Review</div>
            <button onClick={() => { setDetailsFor(null); setDetails(null); setDetailsError(null); }} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#e4e4e7" }}>
              Close
            </button>
          </div>
          <div style={{ padding: 12 }}>
            {detailsLoading && <p style={{ color: "#a1a1aa", margin: 0 }}>Loading details…</p>}
            {detailsError && <p style={{ color: "#f87171", margin: 0 }}>{detailsError}</p>}
            {details && (() => {
              const report = (details.result?.result ?? details.result ?? {}) as any;
              const filled: { label: string; value_preview: string }[] =
                Array.isArray(report.filled_fields) ? report.filled_fields : [];
              const missing: { label: string; selector_hint?: string }[] =
                Array.isArray(report.missing_required) ? report.missing_required : [];

              const copy = (text: string) => {
                if (!text) return;
                if (navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(text).catch(() => {});
                }
              };

              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  {details?.result?.streamingUrl && (
                    <div style={{ border: "1px solid #27272a", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#09090b", borderBottom: "1px solid #27272a" }}>
                        <div style={{ color: "#e4e4e7", fontWeight: 600 }}>Live run</div>
                        <a href={details.result.streamingUrl} target="_blank" rel="noopener noreferrer">Open in new tab</a>
                      </div>
                      <iframe src={details.result.streamingUrl} style={{ width: "100%", height: 520, border: "none", background: "#000" }} />
                    </div>
                  )}

                  <div style={{ border: "1px solid #27272a", borderRadius: 10, padding: 12, background: "#09090b" }}>
                    <div style={{ color: "#e4e4e7", fontWeight: 600, marginBottom: 8 }}>Filled fields</div>
                    {filled.length === 0 ? (
                      <p style={{ color: "#71717a", margin: 0 }}>Agent did not fill any fields.</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #27272a" }}>Label</th>
                            <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #27272a" }}>Value</th>
                            <th style={{ width: 60, padding: "4px 6px", borderBottom: "1px solid #27272a" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filled.map((f, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: "4px 6px", borderBottom: "1px solid #27272a" }}>{f.label}</td>
                              <td style={{ padding: "4px 6px", borderBottom: "1px solid #27272a", color: "#a1a1aa" }}>{f.value_preview}</td>
                              <td style={{ padding: "4px 6px", borderBottom: "1px solid #27272a" }}>
                                <button
                                  onClick={() => copy(f.value_preview)}
                                  style={{ padding: "2px 6px", borderRadius: 999, border: "1px solid #27272a", background: "transparent", color: "#e4e4e7", fontSize: 10 }}
                                >
                                  Copy
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div style={{ border: "1px solid #27272a", borderRadius: 10, padding: 12, background: "#09090b" }}>
                    <div style={{ color: "#e4e4e7", fontWeight: 600, marginBottom: 8 }}>Missing required</div>
                    {missing.length === 0 ? (
                      <p style={{ color: "#22c55e", margin: 0 }}>No missing required fields detected.</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #27272a" }}>Label</th>
                            <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #27272a" }}>Hint</th>
                          </tr>
                        </thead>
                        <tbody>
                          {missing.map((m, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: "4px 6px", borderBottom: "1px solid #27272a" }}>{m.label}</td>
                              <td style={{ padding: "4px 6px", borderBottom: "1px solid #27272a", color: "#a1a1aa" }}>{m.selector_hint ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div style={{ border: "1px solid #27272a", borderRadius: 10, padding: 12, background: "#09090b" }}>
                    <div style={{ color: "#e4e4e7", fontWeight: 600, marginBottom: 8 }}>Raw agent JSON</div>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#a1a1aa", fontSize: 12 }}>
                      {JSON.stringify(report, null, 2)}
                    </pre>
                  </div>

                  <div style={{ border: "1px solid #27272a", borderRadius: 10, padding: 12, background: "#09090b" }}>
                    <div style={{ color: "#e4e4e7", fontWeight: 600, marginBottom: 8 }}>Plan snapshot</div>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#a1a1aa", fontSize: 12 }}>
                      {JSON.stringify(details.plan_snapshot ?? {}, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {watchUrl && (
        <div style={{ marginBottom: 16, border: "1px solid #27272a", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#18181b", borderBottom: "1px solid #27272a" }}>
            <div style={{ color: "#e4e4e7", fontWeight: 600 }}>Live run</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <a href={watchUrl} target="_blank" rel="noopener noreferrer">Open in new tab</a>
              <button onClick={() => setWatchUrl(null)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#e4e4e7" }}>
                Close
              </button>
            </div>
          </div>
          <iframe src={watchUrl} style={{ width: "100%", height: 560, border: "none", background: "#000" }} />
        </div>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {apps.map((a) => {
          const job = jobsMap[a.job_id];
          const primaryUrl = a.streaming_url || job?.source_url;
          return (
            <li key={a.id} style={{ padding: "12px 0", borderBottom: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {primaryUrl ? (
                  <a href={primaryUrl} target="_blank" rel="noopener noreferrer">
                    {(job?.job_title || a.job_id) + (a.streaming_url ? " (live)" : "")}
                  </a>
                ) : (
                  a.job_id
                )}
                {job?.company_name && <span style={{ color: "#a1a1aa", marginLeft: 8 }}>{job.company_name}</span>}
                {a.streaming_url && (
                  <button
                    onClick={() => setWatchUrl(a.streaming_url!)}
                    style={{ marginLeft: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid #27272a", background: "#09090b", color: "#e4e4e7", fontSize: 12 }}
                    title="Watch TinyFish browser live"
                  >
                    Watch live
                  </button>
                )}
                <button
                  onClick={() => setDetailsFor(a.id)}
                  style={{ marginLeft: 8, padding: "4px 10px", borderRadius: 999, border: "1px solid #27272a", background: "transparent", color: "#e4e4e7", fontSize: 12 }}
                  title="View details and agent report"
                >
                  Details
                </button>
              </div>
              <span style={{ color: statusColor[a.status] ?? "#71717a", fontWeight: 500 }}>{a.status}</span>
            </li>
          );
        })}
      </ul>
      {apps.length === 0 && <p style={{ color: "#71717a" }}>No applications yet. Go to Jobs and click Glide on a job.</p>}
    </div>
  );
}
