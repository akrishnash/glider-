import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { db, jobs } from "../db/index.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";
import { detectPlatformFromUrl } from "../services/goalBuilder.js";
import { runSync } from "../services/tinyfish.js";

const router = Router();
router.use(authMiddleware);

router.post("/ingest", async (req: Request, res: Response) => {
  const body = req.body as { urls?: string[] };
  const urls = Array.isArray(body.urls) ? body.urls as string[] : [];
  if (urls.length === 0) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "urls array required" } });
    return;
  }
  const now = new Date();
  const created: { id: string; source_url: string; platform: string }[] = [];
  const toEnrich: { id: string; url: string }[] = [];
  for (const url of urls) {
    const u = (url as string).trim();
    if (!u.startsWith("http")) continue;
    const platform = detectPlatformFromUrl(u);
    const existing = db.select().from(jobs).where(eq(jobs.sourceUrl, u)).limit(1).all();
    if (existing.length > 0) {
      created.push({ id: existing[0]!.id, source_url: u, platform });
      continue;
    }
    const id = uuid();
    db.insert(jobs).values({
      id,
      sourceUrl: u,
      platform,
      companyName: null,
      jobTitle: null,
      rawDescription: null,
      metadata: null,
      discoveredAt: now,
      createdAt: now,
    }).run();
    created.push({ id, source_url: u, platform });
    if (platform === "greenhouse") toEnrich.push({ id, url: u });
  }

  // Enrich a few newly-added Greenhouse jobs so titles/details aren't empty.
  // Keep this small to avoid burning credits on bulk URL pastes.
  const ENRICH_LIMIT = 3;
  for (const item of toEnrich.slice(0, ENRICH_LIMIT)) {
    try {
      const goal =
        "Extract the job title, company name, and full job description text from this Greenhouse job posting page. " +
        "Return JSON with keys: job_title, company_name, description.";
      const run = await runSync({ url: item.url, goal, browser_profile: "lite", api_integration: "glider" });
      const r: any = (run as any)?.result ?? run;
      const jobTitle = r?.job_title ?? r?.jobTitle ?? null;
      const companyName = r?.company_name ?? r?.companyName ?? null;
      const description = r?.description ?? r?.raw_description ?? null;
      if (jobTitle || companyName || description) {
        db.update(jobs)
          .set({
            jobTitle: jobTitle ?? undefined,
            companyName: companyName ?? undefined,
            rawDescription: description ?? undefined,
          })
          .where(eq(jobs.id, item.id))
          .run();
      }
    } catch (err) {
      // Non-fatal. The user can still Glide; this is only for nicer UI.
      console.warn("Job enrich failed for", item.url, err);
    }
  }
  res.status(201).json({ jobs: created });
});

router.get("/", (req: Request, res: Response) => {
  const platform = req.query.platform as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const list = platform
    ? db.select().from(jobs).where(eq(jobs.platform, platform as "greenhouse" | "workday" | "lever" | "linkedin")).orderBy(desc(jobs.createdAt)).limit(limit).all()
    : db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(limit).all();
  res.json({
    jobs: list.map((j) => ({
      id: j.id,
      source_url: j.sourceUrl,
      platform: j.platform,
      company_name: j.companyName,
      job_title: j.jobTitle,
      discovered_at: j.discoveredAt,
      created_at: j.createdAt,
    })),
  });
});

router.get("/:id", (req: Request, res: Response) => {
  const id = req.params.id as string;
  const j = db.select().from(jobs).where(eq(jobs.id, id)).limit(1).get();
  if (!j) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
    return;
  }
  res.json({
    job: {
      id: j.id,
      source_url: j.sourceUrl,
      platform: j.platform,
      company_name: j.companyName,
      job_title: j.jobTitle,
      raw_description: j.rawDescription,
      metadata: j.metadata,
      discovered_at: j.discoveredAt,
      created_at: j.createdAt,
    },
  });
});

export default router;
