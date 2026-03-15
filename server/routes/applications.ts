import { Router, Request, Response } from "express";
import { Readable } from "stream";
import { v4 as uuid } from "uuid";
import { db, applications, jobs, resumes, resumeDownloadTokens, profiles } from "../db/index.js";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";
import { buildPlan } from "../services/planBuilder.js";
import { buildGreenhouseGoal } from "../services/goalBuilder.js";
import { startRunAsync, getRunStatus, startRunSSE } from "../services/tinyfish.js";

const router = Router();
router.use(authMiddleware);

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function getBaseUrl(req: Request): string {
  const host = req.get("host") || "localhost:3000";
  const proto = req.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

/** Base URL for links that external services (e.g. TinyFish) must fetch. Use PUBLIC_BASE_URL when set so localhost is not sent to the cloud. */
function getPublicBaseUrl(req: Request): string {
  const pub = process.env.PUBLIC_BASE_URL?.trim();
  if (pub) return pub.replace(/\/$/, "");
  return getBaseUrl(req);
}

function extractStreamingUrl(result: unknown): string | null {
  if (!result) return null;
  if (typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      return (parsed as any)?.streamingUrl ?? (parsed as any)?.streaming_url ?? null;
    } catch {
      return null;
    }
  }
  return (result as any)?.streamingUrl ?? (result as any)?.streaming_url ?? null;
}

router.post("/plan", (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const { job_id: jobId } = req.body as { job_id?: string };
  if (!jobId) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "job_id required" } });
    return;
  }
  const [job] = db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1).all();
  if (!job) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
    return;
  }
  const [latestResume] = db.select().from(resumes).where(eq(resumes.userId, user.userId)).orderBy(desc(resumes.uploadedAt)).limit(1).all();
  const baseUrl = getBaseUrl(req);
  const plan = buildPlan({
    userId: user.userId,
    jobId,
    resumeFileKey: latestResume?.fileKey ?? null,
    baseUrl: baseUrl + "/api/resumes/file", // auth URL for preview; run will use token URL
  });
  if (!plan) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to build plan" } });
    return;
  }
  res.json({ plan, job: { id: job.id, source_url: job.sourceUrl, platform: job.platform, company_name: job.companyName, job_title: job.jobTitle } });
});

router.post("/run", async (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const body = req.body as { job_id?: string; job_ids?: string[] };
  const jobIds = body.job_ids ?? (body.job_id ? [body.job_id] : []);
  if (jobIds.length === 0) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "job_id or job_ids required" } });
    return;
  }
  const baseUrl = getBaseUrl(req);
  const publicBaseUrl = getPublicBaseUrl(req);
  const created: { id: string; job_id: string; status: string; run_id?: string }[] = [];
  const errors: { job_id: string; message: string }[] = [];

  // Gate: ensure required profile + a resume exists before spending TinyFish credits.
  const profile = db.select().from(profiles).where(eq(profiles.userId, user.userId)).limit(1).get();
  const [latestResumeGlobal] = db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, user.userId))
    .orderBy(desc(resumes.uploadedAt))
    .limit(1)
    .all();

  const missingProfile: string[] = [];
  if (!profile?.fullName || !profile.fullName.trim()) missingProfile.push("full_name");
  if (!profile?.phone || !profile.phone.trim()) missingProfile.push("phone");
  if (!profile?.location || !profile.location.trim()) missingProfile.push("location");
  if (!latestResumeGlobal) missingProfile.push("resume");

  if (missingProfile.length > 0) {
    res.status(400).json({
      error: {
        code: "PROFILE_INCOMPLETE",
        message: `Missing required data: ${missingProfile.join(", ")}`,
      },
    });
    return;
  }

  for (const jobId of jobIds) {
    const [job] = db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1).all();
    if (!job) {
      errors.push({ job_id: jobId, message: "Job not found" });
      continue;
    }
    const latestResume = latestResumeGlobal;
    let resumeUrl: string | undefined;
    if (latestResume) {
      const token = uuid();
      db.insert(resumeDownloadTokens).values({
        token,
        userId: user.userId,
        fileKey: latestResume.fileKey,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      }).run();
      resumeUrl = `${publicBaseUrl}/api/resumes/download?token=${token}`;
    }
    const plan = buildPlan({
      userId: user.userId,
      jobId,
      resumeFileKey: latestResume?.fileKey ?? null,
      baseUrl,
    });
    if (!plan) {
      errors.push({ job_id: jobId, message: "Failed to build plan" });
      continue;
    }
    if (resumeUrl) plan.resume_url = resumeUrl;

    const appId = uuid();
    const now = new Date();
    db.insert(applications).values({
      id: appId,
      userId: user.userId,
      jobId,
      status: "pending",
      planSnapshot: plan as unknown as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    }).run();

    const platform = job.platform;
    const goal = platform === "greenhouse" ? buildGreenhouseGoal(plan) : buildGreenhouseGoal(plan);

    try {
      const { run_id, error } = await startRunAsync({
        url: job.sourceUrl,
        goal,
        browser_profile: "stealth",
        api_integration: "glider",
      });
      if (error || !run_id) {
        db.update(applications).set({ status: "failed", result: { error: error?.message ?? "No run_id" }, updatedAt: new Date() }).where(eq(applications.id, appId)).run();
        errors.push({ job_id: jobId, message: error?.message ?? "TinyFish failed to start" });
        created.push({ id: appId, job_id: jobId, status: "failed" });
        continue;
      }
      // Fetch run object once to grab streamingUrl early (nice for live watching).
      let runInfo: Record<string, unknown> | null = null;
      try {
        const run = await getRunStatus(run_id);
        runInfo = { run_id: run.run_id, status: run.status, streamingUrl: run.streamingUrl };
      } catch {
        runInfo = null;
      }

      db.update(applications)
        .set({
          status: "running",
          runId: run_id,
          result: runInfo ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, appId))
        .run();
      created.push({ id: appId, job_id: jobId, status: "running", run_id: run_id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      db.update(applications).set({ status: "failed", result: { error: message }, updatedAt: new Date() }).where(eq(applications.id, appId)).run();
      errors.push({ job_id: jobId, message });
      created.push({ id: appId, job_id: jobId, status: "failed" });
    }
  }

  res.status(201).json({ applications: created, errors: errors.length ? errors : undefined });
});

/**
 * Run a single job application with live SSE stream from Tinyfish.
 * POST body: { job_id: string }
 * Response: text/event-stream; first event is { type: "start", application_id }, then Tinyfish events.
 */
router.post("/run-sse", async (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const { job_id: jobId } = req.body as { job_id?: string };
  if (!jobId) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "job_id required" } });
    return;
  }

  const baseUrl = getBaseUrl(req);
  const publicBaseUrl = getPublicBaseUrl(req);
  const profile = db.select().from(profiles).where(eq(profiles.userId, user.userId)).limit(1).get();
  const [latestResume] = db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, user.userId))
    .orderBy(desc(resumes.uploadedAt))
    .limit(1)
    .all();

  if (!profile?.fullName?.trim() || !profile?.phone?.trim() || !profile?.location?.trim()) {
    res.status(400).json({ error: { code: "PROFILE_INCOMPLETE", message: "Missing required profile: full_name, phone, location" } });
    return;
  }
  if (!latestResume) {
    res.status(400).json({ error: { code: "PROFILE_INCOMPLETE", message: "Upload a resume first" } });
    return;
  }

  const [job] = db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1).all();
  if (!job) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
    return;
  }

  const token = uuid();
  db.insert(resumeDownloadTokens).values({
    token,
    userId: user.userId,
    fileKey: latestResume.fileKey,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  }).run();
  const resumeUrl = `${publicBaseUrl}/api/resumes/download?token=${token}`;

  const plan = buildPlan({
    userId: user.userId,
    jobId,
    resumeFileKey: latestResume.fileKey,
    baseUrl,
  });
  if (!plan) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to build plan" } });
    return;
  }
  plan.resume_url = resumeUrl;

  const goal = buildGreenhouseGoal(plan);
  const appId = uuid();
  const now = new Date();
  db.insert(applications).values({
    id: appId,
    userId: user.userId,
    jobId,
    status: "running",
    planSnapshot: plan as unknown as Record<string, unknown>,
    createdAt: now,
    updatedAt: now,
  }).run();

  try {
    const tinyfishRes = await startRunSSE({
      url: job.sourceUrl,
      goal,
      browser_profile: "stealth",
      api_integration: "glider",
    });

    if (!tinyfishRes.ok) {
      const errData = (await tinyfishRes.json().catch(() => ({}))) as { error?: { message?: string } };
      db.update(applications).set({ status: "failed", result: { error: errData?.error?.message ?? "TinyFish failed" }, updatedAt: new Date() }).where(eq(applications.id, appId)).run();
      res.status(500).json({ error: { code: "TINYFISH_ERROR", message: errData?.error?.message ?? "TinyFish request failed" } });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const startEvent = `data: ${JSON.stringify({ type: "start", application_id: appId, job_id: jobId })}\n\n`;
    res.write(startEvent);

    const body = tinyfishRes.body;
    if (body) {
      const nodeStream = Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]);
      nodeStream.pipe(res, { end: true });
    } else {
      res.end();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    db.update(applications).set({ status: "failed", result: { error: message }, updatedAt: new Date() }).where(eq(applications.id, appId)).run();
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
  }
});

router.get("/stats", (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const rows = db.select({ status: applications.status }).from(applications).where(eq(applications.userId, user.userId)).all();
  const total_runs = rows.length;
  const submitted = rows.filter((r) => r.status === "submitted").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const running = rows.filter((r) => r.status === "running").length;
  const manual_review = rows.filter((r) => r.status === "manual_review").length;
  res.json({
    total_runs,
    submitted,
    failed,
    running,
    manual_review,
  });
});

router.get("/", async (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const status = req.query.status as string | undefined;
  const jobId = req.query.job_id as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const conditions = [eq(applications.userId, user.userId)];
  if (status) conditions.push(eq(applications.status, status as "pending" | "running" | "submitted" | "failed" | "manual_review"));
  if (jobId) conditions.push(eq(applications.jobId, jobId));
  const rows = db.select().from(applications).where(and(...conditions)).orderBy(desc(applications.createdAt)).limit(limit).all();
  // If streaming URL isn't stored yet, fetch it for currently running apps (small batch) to enable "Watch live" ASAP.
  const enriched = await Promise.all(
    rows.map(async (a) => {
      let streamingUrl = extractStreamingUrl(a.result);
      if (!streamingUrl && a.runId && a.status === "running") {
        try {
          const run = await getRunStatus(a.runId);
          streamingUrl = run.streamingUrl ?? null;
          if (streamingUrl) {
            db.update(applications)
              .set({ result: { run_id: a.runId, status: run.status, streamingUrl }, updatedAt: new Date() })
              .where(eq(applications.id, a.id))
              .run();
          }
        } catch {
          // ignore
        }
      }
      return {
        id: a.id,
        job_id: a.jobId,
        status: a.status,
        run_id: a.runId,
        streaming_url: streamingUrl,
        submitted_at: a.submittedAt,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
      };
    })
  );
  res.json({ applications: enriched });
});

router.get("/:id", (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const id = req.params.id as string;
  const a = db.select().from(applications).where(and(eq(applications.id, id), eq(applications.userId, user.userId))).limit(1).get();
  if (!a) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
    return;
  }
  res.json({
    application: {
      id: a.id,
      job_id: a.jobId,
      status: a.status,
      run_id: a.runId,
      plan_snapshot: a.planSnapshot,
      result: a.result,
      submitted_at: a.submittedAt,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    },
  });
});

router.patch("/:id/status", (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const id = req.params.id as string;
  const body = req.body as { status?: string };
  const a = db.select().from(applications).where(and(eq(applications.id, id), eq(applications.userId, user.userId))).limit(1).get();
  if (!a) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
    return;
  }
  const allowed = ["pending", "submitted", "failed", "manual_review"];
  if (!body.status || !allowed.includes(body.status)) {
    res.status(400).json({ error: { code: "INVALID_STATUS", message: `status must be one of: ${allowed.join(", ")}` } });
    return;
  }
  const now = new Date();
  db.update(applications)
    .set({
      status: body.status as "pending" | "submitted" | "failed" | "manual_review",
      submittedAt: body.status === "submitted" ? now : a.submittedAt,
      updatedAt: now,
    })
    .where(eq(applications.id, id))
    .run();
  const updated = db.select().from(applications).where(eq(applications.id, id)).limit(1).get();
  res.json({ application: updated });
});

/**
 * POST /api/applications/log
 * Record an application filled by the Chrome extension (or manually by the user).
 * Creates a job entry if the URL hasn't been seen before.
 * Called by: the web app "Mark Applied" button and the Chrome extension after autofill.
 */
router.post("/log", async (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const body = req.body as {
    url?: string;
    company?: string;
    position?: string;
    status?: string;
    source?: string;
  };

  if (!body.url?.trim().startsWith("http")) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "url is required" } });
    return;
  }

  const { detectPlatformFromUrl } = await import("../services/goalBuilder.js");
  const now = new Date();
  const url = body.url.trim();
  const platform = detectPlatformFromUrl(url);

  let job = db.select().from(jobs).where(eq(jobs.sourceUrl, url)).limit(1).get();
  if (!job) {
    const jobId = uuid();
    db.insert(jobs).values({
      id: jobId,
      sourceUrl: url,
      platform,
      companyName: body.company?.trim() || null,
      jobTitle: body.position?.trim() || null,
      rawDescription: null,
      metadata: null,
      discoveredAt: now,
      createdAt: now,
    }).run();
    job = db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1).get()!;
  } else if (body.company || body.position) {
    db.update(jobs).set({
      companyName: body.company?.trim() || job.companyName,
      jobTitle: body.position?.trim() || job.jobTitle,
    }).where(eq(jobs.id, job.id)).run();
  }

  const allowedStatuses = ["pending", "submitted", "failed", "manual_review"];
  const status = (body.status && allowedStatuses.includes(body.status))
    ? (body.status as "pending" | "submitted" | "failed" | "manual_review")
    : "submitted";

  const appId = uuid();
  db.insert(applications).values({
    id: appId,
    userId: user.userId,
    jobId: job.id,
    status,
    runId: null,
    planSnapshot: null,
    result: { source: body.source ?? "manual" } as Record<string, unknown>,
    submittedAt: status === "submitted" ? now : null,
    createdAt: now,
    updatedAt: now,
  }).run();

  const app = db.select().from(applications).where(eq(applications.id, appId)).limit(1).get()!;
  res.status(201).json({
    application: {
      id: app.id,
      job_id: app.jobId,
      job: { source_url: job.sourceUrl, company_name: job.companyName, job_title: job.jobTitle, platform: job.platform },
      status: app.status,
      submitted_at: app.submittedAt,
      created_at: app.createdAt,
    },
  });
});

export default router;
