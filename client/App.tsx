import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Save,
  Upload,
  Plus,
  Trash2,
  Zap,
  Clock,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import * as api from "./api";
import DashboardLayout from "./components/Dashboard/DashboardLayout";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";

type User = { id: string; email: string } | null;
type Tab = "profile" | "jobs" | "applications" | "analytics";

// ─── shared input class ──────────────────────────────────────────────────────
const INPUT =
  "w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition";
const CARD =
  "bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl";
const BTN_PRIMARY =
  "inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_OUTLINE =
  "inline-flex items-center gap-2 px-4 py-2 border border-slate-600/60 text-slate-300 hover:text-white hover:border-slate-500 rounded-lg transition-all disabled:opacity-50";
const BTN_DANGER =
  "inline-flex items-center gap-2 px-4 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50";

// ── status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending:       { bg: "bg-slate-500/20", text: "text-slate-400",  dot: "bg-slate-500" },
  running:       { bg: "bg-amber-500/20",  text: "text-amber-400",  dot: "bg-amber-500" },
  submitted:     { bg: "bg-green-500/20",  text: "text-green-400",  dot: "bg-green-500" },
  failed:        { bg: "bg-red-500/20",    text: "text-red-400",    dot: "bg-red-500" },
  manual_review: { bg: "bg-orange-500/20", text: "text-orange-400", dot: "bg-orange-500" },
};
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("glider_token"));
  const [user, setUser] = useState<User>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.me(token)
      .then(({ user }) => setUser(user))
      .catch(() => {
        setToken(null);
        localStorage.removeItem("glider_token");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAuth = (t: string) => {
    localStorage.setItem("glider_token", t);
    setToken(t);
    setLoading(true);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("glider_token");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="h-12 w-12 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    return authMode === "login" ? (
      <Login onSuccess={handleAuth} onToggleMode={() => setAuthMode("register")} />
    ) : (
      <Register onSuccess={handleAuth} onToggleMode={() => setAuthMode("login")} />
    );
  }

  return (
    <Dashboard token={token!} user={user} onLogout={handleLogout} />
  );
}

// ─── Dashboard shell ─────────────────────────────────────────────────────────
function Dashboard({ token, user, onLogout }: { token: string; user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("jobs");
  const [stats, setStats] = useState<{ total_runs: number; submitted: number; failed: number; running: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getApplicationStats(token).then(setStats).catch(() => {});
    const t = setInterval(() => api.getApplicationStats(token).then(setStats).catch(() => {}), 20000);
    return () => clearInterval(t);
  }, [token]);

  return (
    <DashboardLayout
      activeTab={tab}
      onTabChange={setTab}
      userEmail={user?.email ?? ""}
      onLogout={onLogout}
      stats={stats ?? undefined}
    >
      {tab === "jobs"         && <JobsTab         token={token} onGoApplications={() => setTab("applications")} />}
      {tab === "applications" && <ApplicationsTab token={token} />}
      {tab === "analytics"    && <AnalyticsTab    token={token} />}
      {tab === "profile"      && <ProfileTab      token={token} />}
    </DashboardLayout>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab({ token }: { token: string }) {
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const [prefs, setPrefs] = useState<Record<string, unknown> | null>(null);
  const [resumes, setResumes] = useState<{ id: string; file_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, pr, r] = await Promise.all([api.getProfile(token), api.getPreferences(token), api.getResumes(token)]);
        setProfile(p.profile ? {
          full_name: p.profile.full_name ?? "", phone: p.profile.phone ?? "",
          location: p.profile.location ?? "", address: p.profile.address ?? "",
          date_of_birth: p.profile.date_of_birth ?? "", linkedin_url: p.profile.linkedin_url ?? "",
          portfolio_url: p.profile.portfolio_url ?? "", summary: p.profile.summary ?? "",
        } : {});
        setPrefs(pr.preferences ?? {});
        setResumes(r.resumes ?? []);
      } catch { setProfile({}); setPrefs({}); }
    })();
  }, [token]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try { await api.updateProfile(token, profile); } finally { setSaving(false); }
  };
  const savePrefs = async () => {
    if (!prefs) return;
    setSaving(true);
    try { await api.updatePreferences(token, prefs); } finally { setSaving(false); }
  };

  const profileFields: { key: string; label: string; type?: string; placeholder?: string }[] = [
    { key: "full_name", label: "Full Name" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "location", label: "Location / City" },
    { key: "address", label: "Address" },
    { key: "date_of_birth", label: "Date of Birth", placeholder: "e.g. 1990-01-15" },
    { key: "linkedin_url", label: "LinkedIn URL", type: "url" },
    { key: "portfolio_url", label: "Portfolio URL", type: "url" },
  ];

  if (profile === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile Setup</h1>
          <p className="text-slate-400 mt-1">Manage your professional information used to fill applications</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={saveProfile} disabled={saving}
          className={BTN_PRIMARY}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Profile"}
        </motion.button>
      </div>

      {/* personal info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${CARD} p-6 sm:p-8`}>
        <h2 className="text-lg font-semibold text-white mb-6">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profileFields.map((f, i) => (
            <motion.div key={f.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <label className="block text-sm font-medium text-slate-300 mb-2">{f.label}</label>
              <input
                type={f.type ?? "text"}
                value={profile[f.key] ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p!, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={INPUT}
              />
            </motion.div>
          ))}
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Professional Summary</label>
          <textarea
            value={profile.summary ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p!, summary: e.target.value }))}
            rows={4}
            placeholder="Brief summary used in cover letters and introductions…"
            className={`${INPUT} resize-none`}
          />
        </div>
      </motion.div>

      {/* resume */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${CARD} p-6 sm:p-8`}>
        <h2 className="text-lg font-semibold text-white mb-2">Resume</h2>
        <p className="text-slate-400 text-sm mb-6">Upload a PDF — name, phone, address and education are extracted to pre-fill fields above.</p>
        {resumes.length > 0 && (
          <ul className="mb-4 space-y-1">
            {resumes.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                {r.file_name}
              </li>
            ))}
          </ul>
        )}
        <label className={`${BTN_OUTLINE} cursor-pointer`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload PDF"}
          <input
            type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploadMsg(null); setUploading(true);
              try {
                const data = await api.uploadResume(token, file);
                const r = await api.getResumes(token);
                setResumes(r.resumes ?? []);
                if (data.extracted && data.extracted_fields?.length) {
                  const fields = (data.extracted_fields as string[]).join(", ");
                  setUploadMsg({ ok: true, text: `Extracted: ${fields}. Review fields above.` });
                  const p = await api.getProfile(token);
                  if (p.profile) setProfile({
                    full_name: p.profile.full_name ?? "", phone: p.profile.phone ?? "",
                    location: p.profile.location ?? "", address: p.profile.address ?? "",
                    date_of_birth: p.profile.date_of_birth ?? "", linkedin_url: p.profile.linkedin_url ?? "",
                    portfolio_url: p.profile.portfolio_url ?? "", summary: p.profile.summary ?? "",
                  });
                  setTimeout(() => setUploadMsg(null), 8000);
                }
              } catch (err) {
                setUploadMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed" });
              } finally { setUploading(false); e.target.value = ""; }
            }}
          />
        </label>
        {uploadMsg && (
          <div className={`mt-4 p-3 rounded-lg text-sm border ${uploadMsg.ok
            ? "bg-green-500/10 border-green-500/40 text-green-400"
            : "bg-red-500/10 border-red-500/40 text-red-400"}`}>
            {uploadMsg.text}
          </div>
        )}
      </motion.div>

      {/* preferences */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={`${CARD} p-6 sm:p-8`}>
        <h2 className="text-lg font-semibold text-white mb-6">Job Preferences</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Roles <span className="text-slate-500 font-normal">(comma-separated)</span></label>
            <input
              value={Array.isArray(prefs?.roles) ? (prefs.roles as string[]).join(", ") : ""}
              onChange={(e) => setPrefs((p) => ({ ...p!, roles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
              placeholder="Software Engineer, Frontend Developer"
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Preferred Locations <span className="text-slate-500 font-normal">(comma-separated)</span></label>
            <input
              value={Array.isArray(prefs?.locations) ? (prefs.locations as string[]).join(", ") : ""}
              onChange={(e) => setPrefs((p) => ({ ...p!, locations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
              placeholder="San Francisco, Remote"
              className={INPUT}
            />
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={savePrefs} disabled={saving} className={BTN_PRIMARY}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Preferences
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────
function JobsTab({ token, onGoApplications }: { token: string; onGoApplications: () => void }) {
  const [jobs, setJobs] = useState<{ id: string; source_url: string; platform: string; company_name?: string; job_title?: string }[]>([]);
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const data = await api.getJobs(token); setJobs(data.jobs ?? []); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const ingest = async () => {
    const list = urls.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!list.length) return;
    setIngesting(true); setMessage(null);
    try {
      await api.ingestJobs(token, list);
      setUrls(""); await load();
      setMessage({ ok: true, text: `${list.length} URL${list.length > 1 ? "s" : ""} added to queue.` });
    } finally { setIngesting(false); }
  };

  const deleteJob = async (jobId: string) => {
    if (!window.confirm("Remove this job?")) return;
    setDeletingId(jobId); setMessage(null);
    try { await api.deleteJob(token, jobId); await load(); setMessage({ ok: true, text: "Job removed." }); }
    catch (err) { setMessage({ ok: false, text: err instanceof Error ? err.message : "Delete failed" }); }
    finally { setDeletingId(null); }
  };

  const markApplied = async (j: typeof jobs[0]) => {
    setMarkingId(j.id); setMessage(null);
    try {
      await api.logApplication(token, {
        url: j.source_url,
        company: j.company_name,
        position: j.job_title,
        status: "submitted",
        source: "manual",
      });
      setMessage({ ok: true, text: `Logged application for ${j.company_name ?? j.job_title ?? "job"}.` });
      onGoApplications();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Failed to log" });
    } finally { setMarkingId(null); }
  };

  return (
    <div className="space-y-8">
      {/* header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Job Queue</h1>
        <p className="text-slate-400 mt-1">
          Add Greenhouse or Lever job URLs. Click <span className="text-violet-400 font-medium">Open</span> to go to the page — the extension will auto-fill the form. Then click <span className="text-green-400 font-medium">Mark Applied</span> to log it.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm border ${message.ok
          ? "bg-green-500/10 border-green-500/40 text-green-400"
          : "bg-red-500/10 border-red-500/40 text-red-400"}`}>
          {message.text}
        </div>
      )}

      {/* how it works banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4 p-4 rounded-xl bg-violet-600/10 border border-violet-500/20">
        <div className="flex-shrink-0 w-8 h-8 bg-violet-600/20 rounded-full flex items-center justify-center text-base">⚡</div>
        <div className="text-sm text-slate-300">
          <p className="font-medium text-white mb-1">How the extension works</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Click <strong className="text-white">Open</strong> — the job page opens in a new tab</li>
            <li>The extension detects the Greenhouse / Lever form and auto-fills it from your profile</li>
            <li>Review unfilled fields (highlighted in yellow), solve CAPTCHA if any</li>
            <li>Submit the form, then come back and click <strong className="text-white">Mark Applied</strong></li>
          </ol>
        </div>
      </motion.div>

      {/* ingest form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${CARD} p-6`}>
        <h2 className="text-base font-semibold text-white mb-4">Add Job URLs</h2>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={4}
          placeholder={"https://boards.greenhouse.io/company/jobs/123\nhttps://jobs.lever.co/company/456"}
          className={`${INPUT} resize-none mb-4`}
        />
        <button onClick={ingest} disabled={ingesting || !urls.trim()} className={BTN_PRIMARY}>
          {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {ingesting ? "Adding…" : "Add to Queue"}
        </button>
      </motion.div>

      {/* job list */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={`${CARD} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Queue</h2>
          <span className="text-xs text-slate-500">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">No jobs yet. Paste URLs above and click Add to Queue.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Job</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Platform</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, idx) => (
                <motion.tr
                  key={j.id}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                  className="border-b border-slate-700/30 hover:bg-slate-700/20 transition group"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{j.job_title || "Untitled role"}</p>
                    {j.company_name && <p className="text-xs text-slate-400 mt-0.5">{j.company_name}</p>}
                    <p className="text-xs text-slate-600 mt-0.5 truncate max-w-xs">{j.source_url}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">{j.platform}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition">
                      {/* Open in new tab — extension auto-fills */}
                      <motion.a
                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                        href={j.source_url} target="_blank" rel="noopener noreferrer"
                        className={`${BTN_OUTLINE} text-xs px-3 py-1.5`}
                        title="Open job page — extension will auto-fill"
                      >
                        <ExternalLink className="h-3 w-3" /> Open
                      </motion.a>
                      {/* Mark Applied */}
                      <motion.button
                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                        onClick={() => markApplied(j)}
                        disabled={markingId === j.id}
                        className={`${BTN_PRIMARY} text-xs px-3 py-1.5`}
                        title="Log as applied"
                      >
                        {markingId === j.id
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Logging…</>
                          : <><CheckCircle2 className="h-3 w-3" /> Mark Applied</>}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
                        onClick={() => deleteJob(j.id)}
                        disabled={deletingId === j.id}
                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                        title="Remove job"
                      >
                        {deletingId === j.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}

// ─── Applications Tab ────────────────────────────────────────────────────────
const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  pending:       [{ label: "Mark Applied",  next: "submitted",     color: "text-green-400 hover:bg-green-500/10" }, { label: "Reject",  next: "failed",     color: "text-red-400 hover:bg-red-500/10" }],
  submitted:     [{ label: "Interview →",   next: "manual_review", color: "text-cyan-400 hover:bg-cyan-500/10" },   { label: "Reject",  next: "failed",     color: "text-red-400 hover:bg-red-500/10" }],
  manual_review: [{ label: "Reopen",        next: "submitted",     color: "text-violet-400 hover:bg-violet-500/10" }],
  failed:        [{ label: "Reopen",        next: "pending",       color: "text-violet-400 hover:bg-violet-500/10" }],
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  submitted: "Applied",
  manual_review: "Interview",
  failed: "Rejected",
};

function ApplicationsTab({ token }: { token: string }) {
  type AppRow = { id: string; job_id: string; status: string; created_at: number; job?: { source_url: string; company_name?: string; job_title?: string } };
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsMap, setJobsMap] = useState<Record<string, { job_title?: string; company_name?: string; source_url: string }>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState({ url: "", company: "", position: "" });
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [data, jd] = await Promise.all([api.getApplications(token), api.getJobs(token)]);
      setApps(data.applications ?? []);
      const map: Record<string, { job_title?: string; company_name?: string; source_url: string }> = {};
      for (const j of jd.jobs ?? []) map[j.id] = { job_title: j.job_title, company_name: j.company_name, source_url: j.source_url };
      setJobsMap(map);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id); setStatusMenuId(null);
    try { await api.updateApplicationStatus(token, id, newStatus); await load(); }
    catch (err) { setMessage({ ok: false, text: err instanceof Error ? err.message : "Update failed" }); }
    finally { setUpdatingId(null); }
  };

  const logApplication = async () => {
    if (!logForm.url.trim().startsWith("http")) {
      setMessage({ ok: false, text: "Please enter a valid job URL." }); return;
    }
    setLogging(true); setMessage(null);
    try {
      await api.logApplication(token, {
        url: logForm.url.trim(),
        company: logForm.company.trim() || undefined,
        position: logForm.position.trim() || undefined,
        source: "manual",
      });
      setLogForm({ url: "", company: "", position: "" });
      await load();
      setMessage({ ok: true, text: "Application logged." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Failed" });
    } finally { setLogging(false); }
  };

  const stats = {
    total: apps.length,
    applied: apps.filter((a) => a.status === "submitted").length,
    interview: apps.filter((a) => a.status === "manual_review").length,
  };

  return (
    <div className="space-y-8" onClick={() => setStatusMenuId(null)}>
      <div>
        <h1 className="text-3xl font-bold text-white">Applications</h1>
        <p className="text-slate-400 mt-1">Track every application you submit via the extension or manually.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm border ${message.ok
          ? "bg-green-500/10 border-green-500/40 text-green-400"
          : "bg-red-500/10 border-red-500/40 text-red-400"}`}>
          {message.text}
        </div>
      )}

      {/* stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total",     value: stats.total,     color: "from-violet-600 to-violet-500" },
          { label: "Applied",   value: stats.applied,   color: "from-green-600 to-green-500" },
          { label: "Interview", value: stats.interview,  color: "from-cyan-600 to-cyan-500" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`${CARD} p-6 relative overflow-hidden hover:border-slate-600/50 transition`}>
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-cyan-600/5" />
            <p className="text-slate-400 text-sm">{s.label}</p>
            <p className={`text-4xl font-bold mt-2 bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* manual log form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${CARD} p-6`}>
        <h2 className="text-base font-semibold text-white mb-4">Log an Application</h2>
        <p className="text-sm text-slate-400 mb-4">
          Already applied via the extension? Log it here, or add applications from other platforms.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            value={logForm.url}
            onChange={(e) => setLogForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="Job URL (required)"
            className={INPUT}
          />
          <input
            value={logForm.company}
            onChange={(e) => setLogForm((f) => ({ ...f, company: e.target.value }))}
            placeholder="Company (optional)"
            className={INPUT}
          />
          <input
            value={logForm.position}
            onChange={(e) => setLogForm((f) => ({ ...f, position: e.target.value }))}
            placeholder="Position (optional)"
            className={INPUT}
          />
        </div>
        <button onClick={logApplication} disabled={logging || !logForm.url.trim()} className={BTN_PRIMARY}>
          {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {logging ? "Logging…" : "Log Application"}
        </button>
      </motion.div>

      {/* apps table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${CARD} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">History</h2>
          <span className="text-xs text-slate-500">{apps.length} application{apps.length !== 1 ? "s" : ""}</span>
        </div>
        {loading && apps.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
        ) : apps.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No applications yet.<br />
            <span className="text-slate-600">Use the extension to autofill forms, then log them here — or use the form above.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Update</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a, idx) => {
                  const job = jobsMap[a.job_id];
                  const transitions = STATUS_TRANSITIONS[a.status] ?? [];
                  return (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20 transition"
                    >
                      <td className="px-6 py-4 font-medium text-white">
                        {job?.company_name ?? "—"}
                        {job?.source_url && (
                          <a href={job.source_url} target="_blank" rel="noopener noreferrer"
                            className="ml-2 text-slate-600 hover:text-violet-400 transition" onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="h-3 w-3 inline" />
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{job?.job_title ?? "—"}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={STATUS_LABELS[a.status] ?? a.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm hidden sm:table-cell">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 relative" onClick={(e) => e.stopPropagation()}>
                        {updatingId === a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                        ) : transitions.length > 0 ? (
                          <div className="relative inline-block">
                            <button
                              onClick={() => setStatusMenuId(statusMenuId === a.id ? null : a.id)}
                              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white border border-slate-700/60 hover:border-slate-500 px-2.5 py-1.5 rounded-lg transition"
                            >
                              Move to <ChevronDown className="h-3 w-3" />
                            </button>
                            {statusMenuId === a.id && (
                              <div className="absolute right-0 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 py-1">
                                {transitions.map((t) => (
                                  <button key={t.next} onClick={() => updateStatus(a.id, t.next)}
                                    className={`w-full text-left px-3 py-2 text-xs ${t.color} transition`}>
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────
const CHART_COLORS = ["#7C3AED", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

function AnalyticsTab({ token }: { token: string }) {
  const [apps, setApps] = useState<{ status: string; created_at: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getApplications(token)
      .then((d) => setApps(d.applications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div>;

  // build last-30-days timeline
  const timeline: { date: string; applications: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    timeline.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), applications: 0 });
  }
  apps.forEach((a) => {
    const diff = Math.floor((Date.now() - a.created_at) / 86400000);
    if (diff < 30) timeline[29 - diff].applications++;
  });

  // status distribution
  const statusCounts: Record<string, number> = {};
  apps.forEach((a) => { statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const submitted = apps.filter((a) => a.status === "submitted").length;
  const timeSaved = apps.length * 8;
  const rate = apps.length > 0 ? ((submitted / apps.length) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-1">Track your application performance</p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Time Saved",    value: `${timeSaved}h`,  icon: Clock,       color: "from-violet-600 to-violet-500" },
          { label: "Total Runs",    value: `${apps.length}`, icon: TrendingUp,  color: "from-cyan-600 to-cyan-500" },
          { label: "Submit Rate",   value: `${rate}%`,       icon: Zap,         color: "from-green-600 to-green-500" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className={`${CARD} p-6 relative overflow-hidden hover:border-slate-600/50 transition group`}>
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-cyan-600/5" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{s.label}</p>
                  <p className={`text-4xl font-bold mt-2 bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
                </div>
                <div className={`p-3 bg-gradient-to-br ${s.color} rounded-lg opacity-50 group-hover:opacity-100 transition`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* timeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${CARD} p-6`}>
          <h2 className="text-lg font-semibold text-white mb-4">Applications Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.25)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "rgba(15,23,42,.95)", border: "1px solid rgba(71,85,105,.5)", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
              <Line type="monotone" dataKey="applications" stroke="#7C3AED" strokeWidth={2.5} dot={{ fill: "#7C3AED", r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* status pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${CARD} p-6`}>
          <h2 className="text-lg font-semibold text-white mb-4">Applications by Status</h2>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(15,23,42,.95)", border: "1px solid rgba(71,85,105,.5)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {statusData.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3 justify-center">
              {statusData.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* daily bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={`${CARD} p-6`}>
        <h2 className="text-lg font-semibold text-white mb-4">Daily Activity (last 30 days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.25)" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} interval={4} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "rgba(15,23,42,.95)", border: "1px solid rgba(71,85,105,.5)", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
            <Bar dataKey="applications" fill="#7C3AED" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
